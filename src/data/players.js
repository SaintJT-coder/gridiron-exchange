// Demo prices/changes are invented. Headshot URLs are external references for prototyping;
// verify source terms and licensing before any public/commercial launch.
const espn = id => `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`;

export const players = [
  { id:'patrick-mahomes', name:'Patrick Mahomes', team:'KC', position:'QB', price:135.72, change:7.9, trend:[5,7,6,9,8,12,15], espnId:'3139477', headshot:espn('3139477') },
  { id:'josh-allen', name:'Josh Allen', team:'BUF', position:'QB', price:124.36, change:6.2, trend:[4,5,8,7,9,11,12], espnId:'3918298', headshot:espn('3918298') },
  { id:'lamar-jackson', name:'Lamar Jackson', team:'BAL', position:'QB', price:121.06, change:10.8, trend:[3,4,3,8,9,11,14], espnId:'3916387', headshot:espn('3916387') },
  { id:'justin-jefferson', name:'Justin Jefferson', team:'MIN', position:'WR', price:148.32, change:12.5, trend:[3,7,6,9,11,10,16], espnId:'4262921', headshot:espn('4262921') },
  { id:'jamar-chase', name:"Ja'Marr Chase", team:'CIN', position:'WR', price:112.47, change:9.3, trend:[4,6,5,9,7,12,13], espnId:'4362628', headshot:espn('4362628') },
  { id:'saquon-barkley', name:'Saquon Barkley', team:'PHI', position:'RB', price:96.21, change:8.7, trend:[4,3,7,6,9,10,12], espnId:'3929630', headshot:espn('3929630') },
  { id:'ceedee-lamb', name:'CeeDee Lamb', team:'DAL', position:'WR', price:105.32, change:5.6, trend:[4,6,5,7,8,7,10], espnId:'4241389', headshot:espn('4241389') },
  { id:'breece-hall', name:'Breece Hall', team:'NYJ', position:'RB', price:89.14, change:4.2, trend:[4,5,4,6,5,7,8], espnId:'4427366', headshot:espn('4427366') },
  { id:'tee-higgins', name:'Tee Higgins', team:'CIN', position:'WR', price:78.60, change:3.8, trend:[3,4,5,4,5,6,7], espnId:'4239993', headshot:espn('4239993') },
  { id:'george-kittle', name:'George Kittle', team:'SF', position:'TE', price:72.31, change:2.9, trend:[3,4,4,5,4,6,7], espnId:'3040151', headshot:espn('3040151') },
  { id:'travis-kelce', name:'Travis Kelce', team:'KC', position:'TE', price:83.45, change:-1.4, trend:[9,8,9,7,6,7,5], espnId:'15847', headshot:espn('15847') },
  { id:'tyreek-hill', name:'Tyreek Hill', team:'MIA', position:'WR', price:91.25, change:-2.1, trend:[12,10,11,8,9,6,4], espnId:'3116406', headshot:espn('3116406') },
  { id:'jalen-hurts', name:'Jalen Hurts', team:'PHI', position:'QB', price:118.80, change:4.8, trend:[5,6,4,8,7,9,10], espnId:'4040715', headshot:espn('4040715') },
  { id:'christian-mccaffrey', name:'Christian McCaffrey', team:'SF', position:'RB', price:110.42, change:3.2, trend:[5,6,7,6,8,7,9], espnId:'3117251', headshot:espn('3117251') },
];