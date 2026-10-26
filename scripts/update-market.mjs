import fs from 'node:fs/promises';
import { players } from '../src/data/players.js';
import { json, seasonGames, readFantasyWeek, hasAppearance } from '../src/services/playerHistory.js';
import { settlePlayer, captureProjections, verifyIdentity } from '../src/services/marketLedger.js';

const arg = name => process.argv[process.argv.indexOf(name)+1];
const statePath=process.argv.includes('--state')?arg('--state'):'public/market.json';
const outPath=process.argv.includes('--output')?arg('--output'):'public/market.json';
let previous;
try { previous=JSON.parse(await fs.readFile(statePath,'utf8')); }
catch(error) { if(error.code!=='ENOENT') throw error; }
const historical=!previous || process.argv.includes('--allow-historical-backfill');
const now=new Date().toISOString();
const current=new Date(now);
const season=current.getUTCMonth()<7?current.getUTCFullYear()-1:current.getUTCFullYear();
const api='https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const filter=JSON.stringify({players:{filterIds:{value:players.map(p=>Number(p.espnId))},filterStatsForSourceIds:{value:[0,1]},filterStatsForSplitTypeIds:{value:[1]}}});
const fantasy=await json(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leaguedefaults/3?view=kona_playercard`,{'x-fantasy-filter':filter});
if(!Array.isArray(fantasy.players) || fantasy.players.length!==players.length) throw new Error('Incomplete fantasy pool; previous market left untouched.');
const boards=await Promise.all([season,season+1].map(year=>json(`${api}/scoreboard?dates=${year}&limit=1000`)));
const schedule=[...new Map(boards.flatMap(board=>(board.events||[]).filter(e=>e.season?.year===season && [2,3].includes(e.season.type)).map(e=>({id:e.id,date:e.date,season,seasonType:String(e.season.type),week:e.week.number,
  state:e.status.type.state,completed:e.status.type.completed,status:e.status.type.shortDetail,
  teams:e.competitions[0].competitors.map(c=>String(c.team.id)),
  matchup:e.shortName,home:e.competitions[0].competitors.find(c=>c.homeAway==='home')?.team.abbreviation,
  away:e.competitions[0].competitors.find(c=>c.homeAway==='away')?.team.abbreviation}))).map(event=>[event.id,event])).values()];
if(schedule.length<200) throw new Error('Incomplete schedule; previous market left untouched.');
const results=[];
for(let i=0;i<players.length;i+=2) {
  results.push(...await Promise.all(players.slice(i,i+2).map(async player=>{
    const old=previous?.players.find(p=>p.id===player.id);
    let metadata={...player};
    try {
      const profile=(await json(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${player.espnId}`)).athlete;
      verifyIdentity(player,profile);
      if(!profile?.team?.id) throw new Error('Missing player team');
      metadata={...player,name:profile.displayName,teamId:String(profile.team.id),team:profile.team.abbreviation,
        position:profile.position.abbreviation,headshot:profile.headshot?.href||player.headshot};
      const games=await seasonGames(player,season,{fantasy,known:old?.history});
      const relevant=schedule.filter(g=>g.teams.includes(metadata.teamId));
      // Verify recent completed games even when the athlete log has not caught up.
      for(const event of relevant.filter(g=>g.completed && (!old?.checkedThrough || Date.parse(g.date)>Date.parse(old.checkedThrough)))) {
        if(games.some(g=>g.id===event.id)) continue;
        const box=await json(`${api}/summary?event=${event.id}`);
        if(hasAppearance(box,player.espnId)) games.push({...event,matchup:event.matchup,result:event.status,...readFantasyWeek(fantasy,player.espnId,season,event.week,event.seasonType)});
      }
      const snapshots=captureProjections(old?.snapshots,relevant,event=>readFantasyWeek(fantasy,player.espnId,season,event.week,event.seasonType).baseline,now);
      const settled=settlePlayer(old,metadata,games,snapshots,now,historical);
      let archive=old?.archive||[];
      if(!old && settled.history.length<5) {
        const previousGames=await seasonGames(player,season-1);
        archive=previousGames.slice(-5).map(g=>({...g,before:null,price:null,delta:null,change:null,settlement:'archived',projectionSource:'historical-archive'}));
      }
      return {...settled,archive,checkedThrough:now,error:null};
    } catch(error) {
      if(!old) return {...metadata,price:player.price,history:[],snapshots:{},complete:false,error:error.message};
      return {...old,error:error.message};
    }
  })));
}
const market={version:1,generatedAt:now,season,players:results,schedule};
await fs.mkdir(new URL('../public/',import.meta.url),{recursive:true});
await fs.writeFile(outPath,JSON.stringify(market,null,2)+'\n');
console.log(JSON.stringify({generatedAt:now,settledPlayers:results.filter(p=>p.complete&&!p.error).length,total:results.length,errors:results.filter(p=>p.error).map(p=>({id:p.id,error:p.error}))}));
