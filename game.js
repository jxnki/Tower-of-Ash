// ═══════════════════════════════════════════════════════
//  TOWER OF ASH  —  game.js  (enhanced)
// ═══════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const HUD_H  = 64;
const HINT_H = 32;

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight - HUD_H - HINT_H;
}
resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  if (state && state.player) buildFloor();
});

// ── Screen helpers ──────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Ember particles on title ────────────────────────────
(function spawnEmbers() {
  const layer = document.getElementById('embers');
  if (!layer) return;
  for (let i = 0; i < 40; i++) {
    const e = document.createElement('div');
    e.className = 'ember-particle';
    e.style.cssText = `left:${Math.random()*100}%;
      width:${2+Math.random()*3}px;height:${2+Math.random()*3}px;
      animation-duration:${3+Math.random()*5}s;
      animation-delay:${Math.random()*6}s;
      --drift:${(Math.random()-0.5)*80}px;`;
    layer.appendChild(e);
  }
})();

// ═══════════════════════════════════════════════════════
//  FLOOR DEFINITIONS
// ═══════════════════════════════════════════════════════
const FLOOR_DATA = [
  {
    num:1, name:'Floor 1 — The Gate',
    bgTop:'#2a2420', bgBot:'#1a1208',
    groundColor:'#5a4a38', groundTop:'#7a6a50', wallColor:'#3a2e24',
    platColor:'#6a5a44', platTop:'#9a8060', accent:'#c08840',
    torchColor:'#ff8820', fogColor:null,
    enemyTypes:['skeleton','crawler'], enemyCount:5, hasMiniB:false,
    coinColor:'#f0c030', coinGlow:'rgba(240,180,20,0.35)',
  },
  {
    num:2, name:'Floor 2 — The Graveyard',
    bgTop:'#10121e', bgBot:'#080a14',
    groundColor:'#1e2430', groundTop:'#2e3444', wallColor:'#141820',
    platColor:'#242840', platTop:'#3a4060', accent:'#5060a0',
    torchColor:'#4060ff', fogColor:'rgba(60,70,140,0.12)',
    enemyTypes:['zombie','wraith'], enemyCount:6, hasMiniB:false,
    coinColor:'#a0c0f0', coinGlow:'rgba(80,120,220,0.35)',
  },
  {
    num:3, name:'Floor 3 — The Forge',
    bgTop:'#1e0800', bgBot:'#100400',
    groundColor:'#3a1800', groundTop:'#5a2c00', wallColor:'#280c00',
    platColor:'#4a2000', platTop:'#8a4000', accent:'#ff6010',
    torchColor:'#ff4400', fogColor:'rgba(200,60,10,0.08)',
    enemyTypes:['imp','golem'], enemyCount:6, hasMiniB:true, miniBossType:'ironWarden',
    coinColor:'#ff8830', coinGlow:'rgba(220,80,10,0.35)',
  },
  {
    num:4, name:'Floor 4 — The Abyss',
    bgTop:'#060610', bgBot:'#020208',
    groundColor:'#100e1c', groundTop:'#1a1830', wallColor:'#0c0c18',
    platColor:'#1a1830', platTop:'#302860', accent:'#7050d0',
    torchColor:'#8040ff', fogColor:'rgba(50,30,120,0.14)',
    enemyTypes:['shadowCrawler','phantomArcher'], enemyCount:7, hasMiniB:false,
    coinColor:'#cc88ff', coinGlow:'rgba(140,60,240,0.35)',
  },
  {
    num:5, name:'Floor 5 — The Throne',
    bgTop:'#120e0a', bgBot:'#080602',
    groundColor:'#2a1e14', groundTop:'#3a2e20', wallColor:'#1a1410',
    platColor:'#342818', platTop:'#6a5030', accent:'#d4a017',
    torchColor:'#ffcc00', fogColor:'rgba(160,110,10,0.07)',
    enemyTypes:['ashWraith','corruptedSoldier'], enemyCount:5, hasMiniB:true, miniBossType:'ashenKing',
    coinColor:'#ffd700', coinGlow:'rgba(212,160,10,0.40)',
  },
];

// ═══════════════════════════════════════════════════════
//  ENEMY DEFS
// ═══════════════════════════════════════════════════════
const ENEMY_DEFS = {
  skeleton:         { w:28,h:38, hp:30,  dmg:8,  speed:1.2, col:'#d0c4b0', eyeCol:'#ff3300', aiType:'patrol' },
  crawler:          { w:24,h:20, hp:20,  dmg:6,  speed:2.0, col:'#8a7060', eyeCol:'#ff5500', aiType:'chase'  },
  zombie:           { w:30,h:40, hp:55,  dmg:12, speed:0.8, col:'#607050', eyeCol:'#88ff00', aiType:'patrol' },
  wraith:           { w:26,h:32, hp:28,  dmg:10, speed:2.2, col:'#8090d0', eyeCol:'#aaccff', aiType:'fly'    },
  imp:              { w:22,h:26, hp:32,  dmg:8,  speed:2.4, col:'#d04428', eyeCol:'#ffcc00', aiType:'chase'  },
  golem:            { w:40,h:44, hp:90,  dmg:20, speed:0.7, col:'#807060', eyeCol:'#ff8800', aiType:'patrol' },
  shadowCrawler:    { w:26,h:20, hp:38,  dmg:12, speed:2.6, col:'#6040c0', eyeCol:'#cc88ff', aiType:'chase'  },
  phantomArcher:    { w:24,h:34, hp:32,  dmg:14, speed:1.0, col:'#7060c0', eyeCol:'#8888ff', aiType:'shoot'  },
  ashWraith:        { w:28,h:34, hp:44,  dmg:14, speed:1.9, col:'#b0a090', eyeCol:'#ffaa00', aiType:'fly'    },
  corruptedSoldier: { w:32,h:40, hp:65,  dmg:16, speed:1.3, col:'#907860', eyeCol:'#ff6600', aiType:'patrol' },
  ironWarden:       { w:56,h:60, hp:220, dmg:26, speed:0.6, col:'#a09070', eyeCol:'#ff8800', aiType:'miniboss' },
  ashenKing:        { w:60,h:64, hp:380, dmg:32, speed:0.9, col:'#c0a070', eyeCol:'#ffcc00', aiType:'boss', phase:1 },
};

// ═══════════════════════════════════════════════════════
//  CINDER DRAUGHT — ACTIVE HOTKEY SYSTEM
//  Buy at shrines (Floor 3+) for 18 coins. Press E to use.
// ═══════════════════════════════════════════════════════
const DRAUGHT_COST = 18;
const DRAUGHT_HP_RESTORE = 45;

// Global persistent bank
let totalCoins  = 0;
let draughtHeld = 0;   // charges in inventory
let draughtUsed = 0;

// ═══════════════════════════════════════════════════════
//  GAME STATE
// ═══════════════════════════════════════════════════════
let state = {};

function initState() {
  state = {
    floorIndex:0, player:null, enemies:[], projectiles:[],
    platforms:[], particles:[], torches:[],
    hazardTiles:[], shrines:[],
    coins:[], floatingTexts:[],
    key:null, keyCollected:false, door:null,
    camera:{x:0}, keys:{},
    attackTimer:0, throwTimer:0, invTimer:0,
    gameOver:false, win:false,
    miniBossSpawned:false, miniBossDefeated:false,
    flashTimer:0,
    transitioningFloor:false,
    shrinePrompt: null,   // { shrine, timer } — shows "E: Buy Draught" near shrine
  };
  totalCoins  = 0;
  draughtHeld = 0;
  draughtUsed = 0;
}

// ═══════════════════════════════════════════════════════
//  PLAYER
// ═══════════════════════════════════════════════════════
const P_W=30, P_H=40, GRAVITY=0.6, JUMP_F=-14, SPEED=4.5;

function createPlayer(x,y) {
  return { x,y,w:P_W,h:P_H, vx:0,vy:0, onGround:false, facingRight:true,
           hp:100,maxHp:100, attacking:false, frame:0, frameTimer:0 };
}

function createEnemy(type,x,y) {
  const d = ENEMY_DEFS[type];
  return { type,x,y,w:d.w,h:d.h, hp:d.hp,maxHp:d.hp,dmg:d.dmg,speed:d.speed,
           col:d.col, eyeCol:d.eyeCol, aiType:d.aiType,
           vx:d.speed*(Math.random()>0.5?1:-1), vy:0, onGround:false,
           attackTimer:0, shootTimer:0, flyOffset:Math.random()*6.28,
           flyBaseY:y, phase:d.phase||1, hitFlash:0, dead:false };
}

// ═══════════════════════════════════════════════════════
//  BUILD FLOOR
// ═══════════════════════════════════════════════════════
const LEVEL_W = 2600;
const GROUND_H = 64;

function buildFloor() {
  const fd  = FLOOR_DATA[state.floorIndex];
  const cH  = canvas.height;
  const gY  = cH - GROUND_H;

  state.platforms = [
    { x:-60, y:0, w:60, h:cH },
    { x:LEVEL_W, y:0, w:60, h:cH },
  ];
  state.hazardTiles = [];  // floor-3 lava patches
  state.shrines     = [];  // floor-3/4 draught shrines

  let plats = [];

  switch (state.floorIndex) {
    case 0: // The Gate — classic, wide, easy
      state.platforms.push({ x:0, y:gY, w:LEVEL_W, h:GROUND_H });
      plats = [
        [220, gY-110,200],[480, gY-180,180],[760, gY-130,200],
        [1020,gY-210,180],[1280,gY-150,200],[1540,gY-240,170],
        [1780,gY-120,200],[1980,gY-200,180],[2200,gY-160,190],
      ];
      break;

    case 1: // The Graveyard — tall + narrow, drop-down pits
      state.platforms.push({ x:0, y:gY, w:LEVEL_W, h:GROUND_H });
      plats = [
        [180, gY-150, 90],[320, gY-280,80],[500, gY-170,90],
        [680, gY-320,80],[860, gY-200,90],[1040,gY-360,80],
        [1200,gY-240,90],[1400,gY-380,80],[1560,gY-260,90],
        [1740,gY-320,80],[1900,gY-180,90],[2080,gY-300,80],
        [2240,gY-200,100],[2400,gY-340,80],
      ];
      break;

    case 2: // The Forge — hazard ground patches + platforms
      state.platforms.push({ x:0, y:gY, w:LEVEL_W, h:GROUND_H });
      plats = [
        [260, gY-130,160],[520, gY-220,140],[780, gY-150,160],
        [1040,gY-250,140],[1300,gY-170,160],[1560,gY-280,140],
        [1800,gY-140,160],[2020,gY-230,140],[2220,gY-180,160],
      ];
      // Lava hazard patches on the ground
      [140,410,650,870,1150,1430,1680,1950,2120,2380].forEach(hx => {
        state.hazardTiles.push({
          x:hx, y:gY, w:90+Math.random()*40, h:GROUND_H,
          timer:0, active:true,
          cooldown: 180+Math.floor(Math.random()*120), // how long it stays on
          offTime:  90+Math.floor(Math.random()*60),   // how long it stays off
        });
      });
      // Shrine on Floor 3
      state.shrines.push({ x:1280, y:gY-80, w:48, h:80 });
      break;

    case 3: // The Abyss — floating islands over chasms
      // NO continuous ground — broken segments only
      state.platforms.push({ x:0,      y:gY, w:220,  h:GROUND_H }); // start island
      state.platforms.push({ x:LEVEL_W-180, y:gY, w:180, h:GROUND_H }); // end island
      plats = [
        [280, gY-30, 130],[470, gY-80, 110],[650, gY-20, 120],
        [830, gY-100,100],[1010,gY-40, 120],[1190,gY-120,100],
        [1370,gY-50, 120],[1550,gY-140,100],[1720,gY-60, 120],
        [1890,gY-100,110],[2060,gY-30, 120],[2230,gY-120,100],
        [2390,gY-60, 120],
        // High platforms for vertical gameplay
        [350, gY-200,90],[700, gY-220,80],[1100,gY-240,90],
        [1500,gY-260,80],[1900,gY-230,90],[2250,gY-250,80],
      ];
      // Shrine on Floor 4
      state.shrines.push({ x:1600, y:gY-150-80, w:48, h:80 });
      break;

    case 4: // The Throne — wide dramatic arena
      state.platforms.push({ x:0, y:gY, w:LEVEL_W, h:GROUND_H });
      plats = [
        [300, gY-130,200],[600, gY-220,180],[900, gY-150,200],
        [1200,gY-260,180],[1500,gY-170,200],[1800,gY-240,180],
        [2100,gY-150,200],[2350,gY-200,180],
      ];
      break;
  }

  plats.forEach(([px,py,pw]) => state.platforms.push({x:px,y:py,w:pw,h:18}));

  state.torches = [];
  [200,500,800,1100,1400,1700,2000,2300].forEach(tx => {
    state.torches.push({x:tx, y:gY-40, flicker:Math.random()*6.28});
  });
  plats.forEach(([px,py,pw]) => {
    state.torches.push({x:px+10, y:py-30, flicker:Math.random()*6.28});
  });

  state.door = { x:LEVEL_W-140, y:gY-90, w:55, h:90, open:false };

  state.player = createPlayer(80, gY-P_H-4);
  state.keyCollected = false;
  state.key = null;
  state.camera.x = 0;
  state.miniBossSpawned = false;
  state.miniBossDefeated = !fd.hasMiniB;

  state.enemies = [];
  const spacing = (LEVEL_W-350) / fd.enemyCount;
  for (let i=0; i<fd.enemyCount; i++) {
    const type = fd.enemyTypes[i % fd.enemyTypes.length];
    const d    = ENEMY_DEFS[type];
    const ex   = 350 + i*spacing + Math.random()*80;
    state.enemies.push(createEnemy(type, ex, gY-d.h-4));
  }

  if (fd.num===5) {
    state.enemies.push(createEnemy('ashenKing', LEVEL_W-300, gY-ENEMY_DEFS.ashenKing.h-4));
    state.miniBossSpawned = true;
  }

  // Scatter coins across the floor
  spawnFloorCoins();

  state.floatingTexts = [];
  state.draughtPopup = false;
  state.pendingDeath = false;

  updateHUD();
}

function spawnFloorCoins() {
  state.coins = [];
  const fd = FLOOR_DATA[state.floorIndex];
  const gY = canvas.height - GROUND_H;

  // Ground coins
  const groundPositions = [150,320,480,650,900,1120,1350,1580,1820,2050,2280,2450];
  groundPositions.forEach(px => {
    const cluster = 1 + Math.floor(Math.random()*3);
    for (let c=0; c<cluster; c++) {
      state.coins.push({
        x: px + (Math.random()-0.5)*40,
        y: gY - 24 - Math.random()*18,
        bob: Math.random()*6.28,
        col: fd.coinColor, glow: fd.coinGlow, value: 1,
      });
    }
  });

  // Platform coins — pulled from actual platforms this floor
  state.platforms.forEach(pl => {
    if (pl.h !== 18) return; // only floating platforms, not ground/walls
    const count = 2 + Math.floor(Math.random()*3);
    for (let c=0; c<count; c++) {
      state.coins.push({
        x: pl.x + 20 + Math.random()*(pl.w-40),
        y: pl.y - 22,
        bob: Math.random()*6.28,
        col: fd.coinColor, glow: fd.coinGlow, value: 2,
      });
    }
  });
}

// ═══════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════
const GAME_KEYS = new Set([
  'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
  'KeyA','KeyD','KeyW','KeyS',
  'KeyX','KeyC','KeyE','KeyZ','Space'
]);

document.addEventListener('keydown', e => {
  // Only intercept game keys — let Tab/Enter/etc. reach buttons normally
  if (!GAME_KEYS.has(e.code)) return;

  // Only block scrolling keys when the game screen is active
  const gameActive = document.getElementById('screen-game').classList.contains('active');
  if (gameActive) e.preventDefault();

  state.keys[e.code] = true;
  if (e.code==='KeyX' && state.attackTimer<=0 && state.player) {
    state.attackTimer = 22;
    state.player.attacking = true;
  }
  if (e.code==='KeyC' && state.throwTimer<=0) {
    if (totalCoins > 0) {
      state.throwTimer = 20;
      totalCoins--;
      spawnProjectile();
      updateHUD();
    } else {
      const p = state.player;
      if (p) spawnFloatingText(p.x+p.w/2, p.y-10, 'No coins!', '#aa4422', 40);
    }
  }
  if (e.code==='KeyE') {
    if (state.shrinePrompt && totalCoins >= DRAUGHT_COST) {
      totalCoins -= DRAUGHT_COST;
      draughtHeld++;
      draughtUsed++;
      const p = state.player;
      if (p) spawnFloatingText(p.x+p.w/2, p.y-16, 'Draught obtained!', '#ff8840', 70);
      burst(state.shrinePrompt.shrine.x+24, state.shrinePrompt.shrine.y, '#ff8840', 12);
      updateHUD();
    }
    else if (draughtHeld > 0) {
      useDraught();
    }
  }
});
document.addEventListener('keyup', e => { state.keys[e.code]=false; });

function spawnProjectile() {
  const p = state.player; if (!p) return;
  state.projectiles.push({
    x: p.x+(p.facingRight?p.w:-14), y: p.y+p.h*0.3,
    vx: p.facingRight?13:-13, vy:-2,
    w:16,h:16, life:80, fromPlayer:true, dmg:42,
  });
  state.projectiles.push({
    x: p.x+(p.facingRight?p.w+4:-18), y: p.y+p.h*0.4,
    vx: p.facingRight?10:-10, vy:0,
    w:8,h:8, life:60, fromPlayer:true, dmg:14,
  });
}

function spawnEnemyProj(e) {
  const p=state.player; if (!p) return;
  const dx=(p.x+p.w/2)-(e.x+e.w/2), dy=(p.y+p.h/2)-(e.y+e.h/2);
  const len=Math.sqrt(dx*dx+dy*dy)||1;
  state.projectiles.push({
    x:e.x+e.w/2, y:e.y+e.h/2,
    vx:dx/len*4.5, vy:dy/len*4.5,
    w:10,h:10, life:100, fromPlayer:false, dmg:e.dmg*0.6,
  });
}

// ═══════════════════════════════════════════════════════
//  COLLISION
// ═══════════════════════════════════════════════════════
function overlap(a,b) {
  return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
}
function resolveRect(ent, rect) {
  const ox=Math.min(ent.x+ent.w,rect.x+rect.w)-Math.max(ent.x,rect.x);
  const oy=Math.min(ent.y+ent.h,rect.y+rect.h)-Math.max(ent.y,rect.y);
  if (ox<=0||oy<=0) return;
  if (ox<oy) {
    ent.x += ent.x+ent.w/2 < rect.x+rect.w/2 ? -ox : ox;
    ent.vx=0;
  } else {
    if (ent.y+ent.h/2 < rect.y+rect.h/2) { ent.y-=oy; ent.vy=0; ent.onGround=true; }
    else { ent.y+=oy; ent.vy=0; }
  }
}
function applyCollisions(ent) {
  ent.onGround=false;
  state.platforms.forEach(p => { if(overlap(ent,p)) resolveRect(ent,p); });
}

// ═══════════════════════════════════════════════════════
//  UPDATE PLAYER
// ═══════════════════════════════════════════════════════
function updatePlayer() {
  const p=state.player; if (!p) return;

  // Floor 4 modifier: dampened gravity (floatier jumps)
  const gravMod = state.floorIndex === 3 ? 0.36 : GRAVITY;

  if (state.keys['ArrowLeft']||state.keys['KeyA']) { p.vx=-SPEED; p.facingRight=false; }
  else if (state.keys['ArrowRight']||state.keys['KeyD']) { p.vx=SPEED; p.facingRight=true; }
  else p.vx*=0.7;

  if ((state.keys['KeyZ']||state.keys['Space'])&&p.onGround) p.vy=JUMP_F;

  p.vy = Math.min(p.vy+gravMod, 20);
  p.x+=p.vx; p.y+=p.vy;
  applyCollisions(p);
  p.x=Math.max(0, Math.min(p.x, LEVEL_W-p.w));

  // Fall into abyss (floor 4) — kill player
  if (state.floorIndex===3 && p.y > canvas.height+60) {
    damagePlayer(p.hp + 1); // instant death
    return;
  }

  if (state.attackTimer>0) { state.attackTimer--; if(!state.attackTimer) p.attacking=false; }
  if (state.throwTimer>0) state.throwTimer--;
  if (state.invTimer>0)   state.invTimer--;
  if (state.flashTimer>0) state.flashTimer--;

  // Floor 3 hazard tiles — lava burns player on contact
  if (state.floorIndex===2) {
    state.hazardTiles.forEach(h => {
      if (!h.active) return;
      if (p.x+p.w>h.x && p.x<h.x+h.w && p.y+p.h>=h.y && p.y+p.h<=h.y+12) {
        if (state.invTimer<=0) { damagePlayer(6); state.invTimer=20; }
      }
    });
  }

  // Pickup key
  if (state.key&&!state.keyCollected&&overlap(p,state.key)) {
    state.keyCollected=true; state.key=null;
    const ks=document.getElementById('key-status');
    ks.textContent='Found!'; ks.classList.add('found');
    if (state.miniBossDefeated) openDoor();
    spawnFloatingText(p.x+p.w/2, p.y-10, '🗝 Key!', '#d4a017', 80);
  }

  // Pickup coins
  state.coins.forEach(c => {
    if (c.collected) return;
    if (p.x<c.x+14&&p.x+p.w>c.x-14&&p.y<c.y+14&&p.y+p.h>c.y-14) {
      c.collected=true; totalCoins+=c.value;
      burst(c.x,c.y,c.col,5);
      spawnFloatingText(c.x, c.y-8, `+${c.value}`, c.col, 40);
      updateHUD();
    }
  });
  state.coins=state.coins.filter(c=>!c.collected);

  // Shrine proximity
  updateShrines();

  // Enter door
  if (state.door&&state.door.open&&state.keyCollected&&overlap(p,state.door)) {
    if (!state.transitioningFloor) {
      state.transitioningFloor = true;
      showFloorClear(state.floorIndex);
    }
  }

  // Camera
  const tx = p.x - canvas.width*0.35;
  state.camera.x += (tx-state.camera.x)*0.1;
  state.camera.x = Math.max(0, Math.min(state.camera.x, LEVEL_W-canvas.width));
}

function openDoor() { if(state.door) state.door.open=true; }

// ═══════════════════════════════════════════════════════
//  FLOATING TEXTS
// ═══════════════════════════════════════════════════════
function spawnFloatingText(x, y, text, col, life) {
  state.floatingTexts.push({ x, y, text, col, life, maxLife: life });
}
function updateFloatingTexts() {
  state.floatingTexts.forEach(ft => { ft.y -= 0.7; ft.life--; });
  state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);
}

function useDraught() {
  const p = state.player; if (!p || draughtHeld <= 0) return;
  draughtHeld--;
  const restore = Math.max(20, DRAUGHT_HP_RESTORE - draughtUsed * 5);
  p.hp = Math.min(p.maxHp, p.hp + restore);
  state.invTimer = 60;
  burst(p.x+p.w/2, p.y+p.h/2, '#ff8840', 18);
  burst(p.x+p.w/2, p.y+p.h/2, '#ffcc44', 10);
  spawnFloatingText(p.x+p.w/2, p.y-16, `+${restore} HP`, '#ff8840', 80);
  updateHUD();
}

function updateShrines() {
  const p = state.player; if (!p) return;
  state.shrinePrompt = null;
  state.shrines.forEach(s => {
    const dist = Math.abs((p.x+p.w/2)-(s.x+s.w/2));
    if (dist < 80) {
      state.shrinePrompt = { shrine: s };
    }
  });
}

function updateEnemies() {
  const p=state.player;
  const fd=FLOOR_DATA[state.floorIndex];
  const gY=canvas.height-GROUND_H;

  if (fd.hasMiniB&&fd.num===3&&!state.miniBossSpawned&&p&&p.x>1500) {
    state.enemies.push(createEnemy('ironWarden',1900,gY-ENEMY_DEFS.ironWarden.h-4));
    state.miniBossSpawned=true;
  }

  state.enemies.forEach(e => {
    if (e.dead) return;
    if (e.hitFlash>0) e.hitFlash--;

    // Stun timer
    if (e.stunTimer > 0) {
      e.stunTimer--;
      e.vx *= 0.85;
      e.vy += GRAVITY; applyCollisions(e);
      return; // skip AI while stunned
    }

    const dx = p ? (p.x+p.w/2)-(e.x+e.w/2) : 0;

    if (e.aiType==='patrol') {
      e.x+=e.vx; e.vy+=GRAVITY;
      applyCollisions(e);
      if (!e.onGround||e.x<=0||e.x+e.w>=LEVEL_W) e.vx*=-1;
    }
    else if (e.aiType==='chase') {
      e.vx=Math.sign(dx)*e.speed; e.x+=e.vx;
      e.vy+=GRAVITY; applyCollisions(e);
    }
    else if (e.aiType==='fly') {
      e.flyOffset+=0.04;
      e.x+=Math.sign(dx)*e.speed*0.7;
      e.y=e.flyBaseY+Math.sin(e.flyOffset)*36;
    }
    else if (e.aiType==='shoot') {
      e.x+=Math.sign(dx)*e.speed*0.3;
      e.vy+=GRAVITY; applyCollisions(e);
      e.shootTimer++;
      if (e.shootTimer>80) { spawnEnemyProj(e); e.shootTimer=0; }
    }
    else if (e.aiType==='miniboss'||e.aiType==='boss') {
      const spd = (e.aiType==='boss'&&e.phase===2) ? e.speed*1.7 : e.speed;
      e.vx=Math.sign(dx)*spd; e.x+=e.vx;
      e.vy+=GRAVITY; applyCollisions(e);

      const dy = p ? (p.y+p.h/2)-(e.y+e.h/2) : 0;
      const jumpCooldown = e.aiType==='boss' ? 80 : 100;
      e.jumpTimer = (e.jumpTimer||0) + 1;
      if (e.onGround && dy < -60 && Math.abs(dx) < 400 && e.jumpTimer > jumpCooldown) {
        e.vy = -13; e.jumpTimer = 0;
      }

      if (e.aiType==='boss'&&e.phase===2) {
        e.shootTimer=(e.shootTimer||0)+1;
        if (e.shootTimer>55) { spawnEnemyProj(e); e.shootTimer=0; }
      }
      if (e.aiType==='boss'&&e.phase===1&&e.hp<e.maxHp*0.5) {
        e.phase=2; e.speed*=1.5; e.col='#e06020';
        burst(e.x+e.w/2,e.y+e.h/2,'#ff8800',24);
      }
    }

    // Enemy hits player
    if (p&&overlap(e,p)&&state.invTimer<=0&&e.attackTimer<=0) {
      damagePlayer(e.dmg);
      e.attackTimer=55; state.invTimer=45;
    }
    if (e.attackTimer>0) e.attackTimer--;

    // Player melee hits enemy — with combo stagger
    if (p&&p.attacking&&state.attackTimer>14) {
      const hx={x:p.facingRight?p.x+p.w:p.x-38, y:p.y+4, w:38, h:p.h-8};
      if (overlap(hx,e) && !e._hitThisSwing) {
        e._hitThisSwing = true; // only once per swing
        e.hp-=24; e.hitFlash=10;

        // Knockback varies by weight
        const kb = (e.aiType==='miniboss'||e.aiType==='boss') ? 1.5
                 : (e.aiType==='patrol') ? 4 : 6;
        e.vx = p.facingRight ? kb : -kb;

        // Combo counter — 3 hits = stagger
        e.comboHits = (e.comboHits||0) + 1;
        e.comboResetTimer = 90;
        if (e.comboHits >= 3 && e.aiType!=='boss' && e.aiType!=='miniboss') {
          e.stunTimer = 60; e.comboHits = 0;
          e.col = '#e8e000'; // yellow = stunned
          burst(e.x+e.w/2,e.y+e.h/2,'#ffff44',10);
          spawnFloatingText(e.x+e.w/2, e.y-10, 'STAGGER!', '#ffff44', 50);
        } else {
          burst(e.x+e.w/2,e.y+e.h/2,'#ffffff',6);
        }
      }
    } else {
      e._hitThisSwing = false; // reset each frame attacker isn't swinging
    }

    // Combo reset timer
    if (e.comboResetTimer > 0) {
      e.comboResetTimer--;
      if (e.comboResetTimer === 0) e.comboHits = 0;
    }

    if (e.hp<=0) killEnemy(e);
  });

  state.enemies=state.enemies.filter(e=>!e.dead);
}

function killEnemy(e) {
  e.dead=true;
  burst(e.x+e.w/2, e.y+e.h/2, e.col, 14);
  const fd=FLOOR_DATA[state.floorIndex];

  // Drop some coins on kill
  const coinDrop = e.aiType==='boss'?0 : e.aiType==='miniboss'?0 : 1+Math.floor(Math.random()*3);
  for (let i=0;i<coinDrop;i++) {
    const fd2 = FLOOR_DATA[state.floorIndex];
    state.coins.push({
      x: e.x+e.w/2+(Math.random()-0.5)*30,
      y: e.y+e.h/2,
      bob: Math.random()*6.28,
      col: fd2.coinColor, glow: fd2.coinGlow,
      value: 1,
      vy: -(3+Math.random()*4),
      dropping: true,
    });
  }

  if (e.type==='ironWarden') {
    state.miniBossDefeated=true;
    dropKey(e.x+e.w/2, e.y);
    if (state.keyCollected) openDoor();
    // Mini-boss drops bonus coins
    for (let i=0;i<6;i++) {
      const fd2 = FLOOR_DATA[state.floorIndex];
      state.coins.push({
        x: e.x+e.w/2+(Math.random()-0.5)*60,
        y: e.y+e.h/2,
        bob: Math.random()*6.28,
        col: '#ffd700', glow: 'rgba(200,160,10,0.45)',
        value: 3,
        vy: -(4+Math.random()*5),
        dropping: true,
      });
    }
  } else if (e.type==='ashenKing') {
    state.win=true;
    setTimeout(()=>showWinScreen(),1400);
  } else if (!fd.hasMiniB&&!state.key&&!state.keyCollected) {
    const alive=state.enemies.filter(x=>!x.dead).length;
    if (alive<=1||Math.random()<0.38) dropKey(e.x+e.w/2,e.y);
  }
}

function dropKey(x,y) { state.key={x:x-12,y:y,w:24,h:24}; }

// ═══════════════════════════════════════════════════════
//  PROJECTILES
// ═══════════════════════════════════════════════════════
function updateProjectiles() {
  const p=state.player;
  state.projectiles.forEach(proj => {
    proj.x+=proj.vx; proj.y+=proj.vy; proj.life--;
    state.platforms.forEach(pl => { if(overlap(proj,pl)) proj.life=0; });
    if (proj.fromPlayer) {
      state.enemies.forEach(e => {
        if (!e.dead&&overlap(proj,e)) {
          e.hp-=proj.dmg; e.hitFlash=8; proj.life=0;
          burst(proj.x,proj.y,'#ffaa22',5);
        }
      });
    } else if (p&&overlap(proj,p)&&state.invTimer<=0) {
      damagePlayer(proj.dmg); proj.life=0; state.invTimer=30;
    }
  });
  state.projectiles=state.projectiles.filter(p=>p.life>0);
}

// ═══════════════════════════════════════════════════════
//  UPDATE DROPPING COINS
// ═══════════════════════════════════════════════════════
function updateCoins() {
  const gY = canvas.height - GROUND_H;
  state.coins.forEach(c => {
    if (c.dropping) {
      c.vy = (c.vy||0) + 0.5;
      c.y += c.vy;
      if (c.y >= gY - 14) { c.y = gY - 14; c.dropping = false; c.vy = 0; }
    }
    c.bob += 0.06;
  });
}

// ═══════════════════════════════════════════════════════
//  UPDATE HAZARD TILES (Floor 3 lava)
// ═══════════════════════════════════════════════════════
function updateHazardTiles() {
  if (!state.hazardTiles) return;
  state.hazardTiles.forEach(h => {
    h.timer++;
    if (h.active && h.timer > h.cooldown) {
      h.active = false; h.timer = 0;
    } else if (!h.active && h.timer > h.offTime) {
      h.active = true; h.timer = 0;
    }
  });
}
function burst(x,y,col,n) {
  for (let i=0;i<n;i++) state.particles.push({
    x,y, vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6-2,
    life:18+Math.random()*22, col, sz:2+Math.random()*5,
  });
}
function updateParticles() {
  state.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.18;p.life--;});
  state.particles=state.particles.filter(p=>p.life>0);
}

// ═══════════════════════════════════════════════════════
//  DAMAGE
// ═══════════════════════════════════════════════════════
function damagePlayer(amt) {
  const p = state.player; if (!p) return;
  p.hp -= amt; if(p.hp<0)p.hp=0;
  state.flashTimer=10; updateHUD();
  if (p.hp<=0) {
    state.gameOver=true;
    setTimeout(()=>showDeadScreen(), 700);
  }
}

// restartCurrentFloor is handled by restartAndShowIntro() in START section below

function updateHUD() {
  const p=state.player; if(!p) return;
  document.getElementById('bar-hp').style.width=Math.max(0,p.hp/p.maxHp*100)+'%';
  const coinEl = document.getElementById('hud-coins');
  if (coinEl) coinEl.textContent = totalCoins;

  const draughtEl = document.getElementById('hud-draught');
  if (draughtEl) {
    const available = state.floorIndex >= 2;
    draughtEl.style.opacity = available ? '1' : '0.3';
    draughtEl.classList.toggle('affordable', draughtHeld > 0);
    draughtEl.querySelector('.draught-owned').textContent = draughtHeld;
    draughtEl.querySelector('.draught-cost').textContent  = DRAUGHT_COST;
  }
}

// ═══════════════════════════════════════════════════════
//  FLOOR STORY DATA
// ═══════════════════════════════════════════════════════
const FLOOR_STORIES = [
  {
    eyebrow: 'Floor 1',
    title: 'The Gate',
    bgStyle: 'radial-gradient(ellipse 80% 60% at 50% 80%, #3a2010 0%, #100a04 50%, #060402 100%)',
    lore: `The entrance has not been sealed for many years — the bones of those who tried tell you why.\nSkeletons guard what was once a gatehouse. They move with purpose they no longer remember. The crawlers that cling to the walls remember nothing at all.`,
    enemies: [
      { icon:'💀', name:'Skeleton', desc:'Patrols slowly. Low health, but hits harder than it looks.' },
      { icon:'🦎', name:'Crawler',  desc:'Fast and low to the ground. It will close the distance before you notice.' },
    ],
    tip: 'Tip — Coins here are abundant. Stock up for the floors ahead.',
  },
  {
    eyebrow: 'Floor 2',
    title: 'The Graveyard',
    bgStyle: 'radial-gradient(ellipse 80% 60% at 50% 80%, #0a0c20 0%, #050810 50%, #020408 100%)',
    lore: `The second floor was once a burial vault. Now it is simply where the dead wait.\nThe platforms are narrow — a moment of lost footing and you fall into something that does not let you back up. The wraithes don't patrol. They drift. And they always drift toward you.`,
    enemies: [
      { icon:'🧟', name:'Zombie',  desc:'Slow and relentless. High HP — don\'t expect them to go down fast.' },
      { icon:'👻', name:'Wraith',  desc:'Flies freely. Cannot be knocked back. Will pursue through walls.' },
    ],
    tip: 'Tip — The platforms are thin. Watch your footing more than the enemies.',
  },
  {
    eyebrow: 'Floor 3',
    title: 'The Forge',
    bgStyle: 'radial-gradient(ellipse 80% 60% at 50% 80%, #2a0800 0%, #120400 50%, #080200 100%)',
    lore: `Something is still burning in here. Whether it is the forge or the floor itself, you cannot tell.\nThe Imps were made here — small, fast, and joyful about all the wrong things. The Iron Warden was made here too. It has not moved from its post in forty years. It will not move aside for you either.`,
    enemies: [
      { icon:'😈', name:'Imp',         desc:'Charges fast with horns lowered. Kill them before they cluster.' },
      { icon:'🪨', name:'Golem',        desc:'Slow, enormous, resistant to knockback. Don\'t get cornered.' },
      { icon:'⚙',  name:'Iron Warden', desc:'MINI-BOSS. Defeat it to unlock the door. High HP, jumps.' },
    ],
    tip: 'Tip — The Cinder Draught shrine is on this floor. Spend 18◈ to buy a charge. Press E to drink it when hurt.',
  },
  {
    eyebrow: 'Floor 4',
    title: 'The Abyss',
    bgStyle: 'radial-gradient(ellipse 80% 60% at 50% 80%, #08051a 0%, #040310 50%, #020208 100%)',
    lore: `There is no ground here. Only islands of stone floating over nothing.\nYou will not see the bottom of the Abyss. You will not want to. The Shadow Crawlers thrive in this dark — they move faster in it. The Phantom Archers have been here so long they have forgotten they ever had bodies.`,
    enemies: [
      { icon:'🌑', name:'Shadow Crawler',  desc:'Extremely fast. Comes from below platform edges.' },
      { icon:'🏹', name:'Phantom Archer',   desc:'Shoots homing bolts. Keeps distance. Hard to close in on.' },
    ],
    tip: 'Tip — A second shrine is hidden on the platforms here. Another Draught could save your life.',
  },
  {
    eyebrow: 'Floor 5',
    title: 'The Throne',
    bgStyle: 'radial-gradient(ellipse 80% 60% at 50% 80%, #1a1004 0%, #0c0802 50%, #060400 100%)',
    lore: `The throne room. The air is thick with ash and something older than ash.\nThe Ashen King has sat here since the tower appeared. He did not ask for this. He refused to leave. That is the same thing now. He will not speak. He will not negotiate. He will, however, die — if you make him.`,
    enemies: [
      { icon:'🌫', name:'Ash Wraith',        desc:'Phase-walks. Unpredictable flight path. Hits hard from behind.' },
      { icon:'⚔',  name:'Corrupted Soldier', desc:'Armoured and aggressive. High HP, paired with a spear.' },
      { icon:'👑', name:'The Ashen King',     desc:'FINAL BOSS. Two phases. He will not go quietly.' },
    ],
    tip: 'Tip — This is the final floor. Use every resource you have left.',
  },
];

// ═══════════════════════════════════════════════════════
//  FLOOR CLEAR DATA
// ═══════════════════════════════════════════════════════
const FLOOR_CLEAR_LINES = [
  'The Gate is behind you now.',
  'The dead stay dead. For now.',
  'The forge grows cold without you.',
  'You cross the Abyss. You do not look down.',
];

const FLOOR_NEXT_TEASE = [
  'Somewhere above, the dead have not stopped moving.',
  'The Forge\'s heat finds you before you find the stairs.',
  'The darkness of the Abyss has no bottom. You will need to cross it anyway.',
  'The throne room smells of candles and very old ash.',
  '',
];

// ═══════════════════════════════════════════════════════
//  SCREEN: FLOOR INTRO
// ═══════════════════════════════════════════════════════
function showFloorIntro(floorIndex) {
  state.transitioningFloor = false;
  const story = FLOOR_STORIES[floorIndex];
  if (!story) { launchFloor(floorIndex); return; }

  // Populate content
  document.getElementById('intro-eyebrow').textContent = story.eyebrow;
  document.getElementById('intro-title').textContent   = story.title;
  document.getElementById('intro-lore').innerHTML      = story.lore.replace(/\n/g, '<br/><br/>');
  document.getElementById('intro-bg').style.background = story.bgStyle;

  // Enemy list
  const enemyContainer = document.getElementById('intro-enemies');
  enemyContainer.innerHTML = '';
  story.enemies.forEach(en => {
    const row = document.createElement('div');
    row.className = 'intro-enemy-row';
    row.innerHTML = `
      <div class="intro-enemy-icon">${en.icon}</div>
      <div>
        <div class="intro-enemy-name">${en.name}</div>
        <div class="intro-enemy-desc">${en.desc}</div>
      </div>`;
    enemyContainer.appendChild(row);
  });

  // Tip
  const tipEl = document.getElementById('intro-tip');
  tipEl.innerHTML = story.tip.replace('Tip —', '<span>Tip</span> —');

  // Wire button for this floor
  const btn = document.getElementById('btn-enter-floor');
  btn.onclick = () => launchFloor(floorIndex);

  showScreen('screen-floor-intro');
}

// ═══════════════════════════════════════════════════════
//  SCREEN: FLOOR CLEAR
// ═══════════════════════════════════════════════════════
let _clearFloorIndex = -1;

function showFloorClear(clearedFloorIndex) {
  _clearFloorIndex = clearedFloorIndex;
  const fd = FLOOR_DATA[clearedFloorIndex];

  document.getElementById('clear-eyebrow').textContent = `Floor ${fd.num} Cleared`;
  document.getElementById('clear-title').textContent =
    FLOOR_CLEAR_LINES[clearedFloorIndex] || 'Floor cleared.';

  // Stats
  const statsEl = document.getElementById('clear-stats');
  statsEl.innerHTML = `
    <div class="clear-stat">
      <div class="clear-stat-val">${totalCoins}</div>
      <div class="clear-stat-label">Coins held</div>
    </div>
    <div class="clear-stat">
      <div class="clear-stat-val">${draughtHeld}</div>
      <div class="clear-stat-label">Draughts held</div>
    </div>
    <div class="clear-stat">
      <div class="clear-stat-val">${state.player ? Math.max(0,state.player.hp) : 0}</div>
      <div class="clear-stat-label">HP remaining</div>
    </div>`;

  // Next floor tease
  const nextTease = FLOOR_NEXT_TEASE[clearedFloorIndex] || '';
  document.getElementById('clear-next-tease').textContent = nextTease;

  // Show/hide "next floor" button — hide on last floor
  const nextBtn = document.getElementById('btn-next-floor');
  nextBtn.style.display = clearedFloorIndex >= FLOOR_DATA.length-1 ? 'none' : 'block';

  showScreen('screen-floor-clear');
}

// ═══════════════════════════════════════════════════════
//  LAUNCH A FLOOR (after intro or retry)
// ═══════════════════════════════════════════════════════
function launchFloor(floorIndex) {
  state.floorIndex = floorIndex;
  state.gameOver   = false;
  state.win        = false;
  state.transitioningFloor = false;
  const fd = FLOOR_DATA[floorIndex];
  document.getElementById('hud-floor').textContent = fd.name;
  document.getElementById('key-status').textContent = 'Not found';
  document.getElementById('key-status').classList.remove('found');
  resizeCanvas();
  buildFloor();
  updateHUD();
  showScreen('screen-game');
}

// ═══════════════════════════════════════════════════════
//  FLOOR TRANSITION  (called when player exits door)
// ═══════════════════════════════════════════════════════
function nextFloor() {
  const nextIndex = state.floorIndex + 1;
  if (nextIndex >= FLOOR_DATA.length) return;

  // Ensure we leave the clear screen and enter the next floor intro.
  state.floorIndex = nextIndex;
  state.transitioningFloor = false;
  showFloorIntro(nextIndex);
}

// ═══════════════════════════════════════════════════════
//  DRAW HELPERS
// ═══════════════════════════════════════════════════════
function drawRoundRect(x,y,w,h,r,fill) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  ctx.fillStyle=fill; ctx.fill();
}

function drawPlayer(p, t) {
  const inv=state.invTimer>0&&state.invTimer%4<2;
  if (inv) return;
  const x=p.x, y=p.y, fr=p.facingRight;

  const legBob = p.onGround ? Math.sin(t*0.15)*4 : 0;
  ctx.fillStyle='#5a4a8a';
  ctx.fillRect(x+4, y+p.h-14, 10, 14+legBob);
  ctx.fillRect(x+p.w-14, y+p.h-14, 10, 14-legBob);

  ctx.fillStyle='#7a6aaa';
  ctx.fillRect(x+2, y+10, p.w-4, p.h-24);

  ctx.fillStyle='#3a2060';
  ctx.fillRect(fr?x-4:x+4, y+12, 10, p.h-28);

  ctx.fillStyle='#9a8aba';
  if (p.attacking&&state.attackTimer>14) {
    ctx.fillRect(fr?x+p.w:x-16, y+14, 16, 10);
  } else {
    ctx.fillRect(x-4, y+14, 8, p.h-30);
    ctx.fillRect(x+p.w-4, y+14, 8, p.h-30);
  }

  ctx.fillStyle='#e0c8a0';
  ctx.fillRect(x+4, y-2, p.w-8, 14);

  ctx.fillStyle='#3a2a10';
  ctx.fillRect(x+4, y-2, p.w-8, 5);

  ctx.fillStyle='#ffffff';
  const ex=fr?x+p.w-12:x+6;
  ctx.fillRect(ex, y+3, 6, 4);
  ctx.fillStyle='#222288';
  ctx.fillRect(fr?ex+2:ex+1, y+4, 3, 3);

  ctx.fillStyle='#cc3322';
  ctx.fillRect(x+3, y+10, p.w-6, 5);

  if (p.attacking&&state.attackTimer>14) {
    ctx.fillStyle='rgba(255,180,50,0.55)';
    ctx.fillRect(fr?x+p.w:x-38, y+6, 38, p.h-18);
  }

  if (state.throwTimer>22) {
    ctx.fillStyle='#ffcc44';
    ctx.beginPath();
    ctx.arc(fr?x+p.w+6:x-6, y+12, 7, 0, Math.PI*2);
    ctx.fill();
  }

  // Low HP warning glow around player
  if (p.hp <= 20 && !state.draughtPopup) {
    const pulse = 0.3 + Math.sin(Date.now()/120)*0.25;
    ctx.strokeStyle = `rgba(220,40,10,${pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(x-4, y-6, p.w+8, p.h+10);
  }
}

function drawEnemy(e) {
  if (e.dead) return;
  const flash=e.hitFlash>0&&e.hitFlash%2===0;
  ctx.globalAlpha=flash?0.25:1;
  const x=e.x, y=e.y, w=e.w, h=e.h;

  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.fillRect(x+4, y+h-4, w-8, 6);

  if (e.type==='skeleton') {
    ctx.fillStyle=e.col;
    ctx.fillRect(x+6,y+h-18,8,18); ctx.fillRect(x+w-14,y+h-18,8,18);
    ctx.fillRect(x+2,y+8,w-4,h-26);
    ctx.fillStyle='#f0f0e0'; ctx.fillRect(x+4,y-4,w-8,14);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+6,y+2,5,5); ctx.fillRect(x+w-11,y+2,5,5);
    ctx.fillStyle='#888'; ctx.fillRect(x+4,y+h-22,w-8,4);
  }
  else if (e.type==='zombie') {
    ctx.fillStyle=e.col;
    ctx.fillRect(x+4,y,w-8,h);
    ctx.fillStyle='#405040'; ctx.fillRect(x+2,y+8,w-4,h-24);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+6,y+4,6,6); ctx.fillRect(x+w-12,y+4,6,6);
    ctx.fillStyle='#803030';
    ctx.fillRect(x+8,y+18,3,8); ctx.fillRect(x+w-10,y+22,3,6);
  }
  else if (e.type==='crawler') {
    ctx.fillStyle=e.col;
    ctx.fillRect(x,y+6,w,h-10);
    ctx.fillStyle='#6a5040'; ctx.fillRect(x+2,y,w-4,10);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+3,y+2,5,5); ctx.fillRect(x+w-8,y+2,5,5);
    ctx.fillStyle='#8a7060';
    ctx.fillRect(x-6,y+h-14,8,5); ctx.fillRect(x+w-2,y+h-14,8,5);
  }
  else if (e.type==='wraith'||e.type==='ashWraith') {
    ctx.fillStyle=e.col+'cc';
    ctx.beginPath(); ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=e.col; ctx.fillRect(x+6,y+4,w-12,h*0.6);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+6,y+10,6,7); ctx.fillRect(x+w-12,y+10,6,7);
    ctx.fillStyle=e.col+'80';
    for(let i=0;i<3;i++) ctx.fillRect(x+4+i*10,y+h-12,6,14+Math.sin(Date.now()/200+i)*4);
  }
  else if (e.type==='imp') {
    ctx.fillStyle=e.col; ctx.fillRect(x+4,y+4,w-8,h-10);
    ctx.fillStyle='#c03818'; ctx.fillRect(x+2,y,w-4,10);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+4,y+2,5,5); ctx.fillRect(x+w-9,y+2,5,5);
    ctx.fillStyle='#801808';
    ctx.fillRect(x+4,y-8,4,10); ctx.fillRect(x+w-8,y-8,4,10);
    ctx.fillStyle='#902010';
    ctx.fillRect(x-8,y+4,10,12); ctx.fillRect(x+w-2,y+4,10,12);
  }
  else if (e.type==='golem') {
    ctx.fillStyle='#504030'; ctx.fillRect(x+2,y+2,w-4,h-4);
    ctx.fillStyle=e.col; ctx.fillRect(x+6,y+6,w-12,h-12);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+8,y+12,8,8); ctx.fillRect(x+w-16,y+12,8,8);
    ctx.fillStyle='#302010';
    ctx.fillRect(x+14,y+6,2,h-12); ctx.fillRect(x+6,y+h/2,w-12,2);
    ctx.fillStyle='#504030';
    ctx.fillRect(x-8,y+h-20,10,10); ctx.fillRect(x+w-2,y+h-20,10,10);
  }
  else if (e.type==='shadowCrawler') {
    ctx.fillStyle='#20104040'; ctx.fillRect(x-4,y+4,w+8,h-4);
    ctx.fillStyle=e.col; ctx.fillRect(x,y+8,w,h-12);
    ctx.fillStyle='#30208060'; ctx.fillRect(x+2,y,w-4,10);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+4,y+2,7,7); ctx.fillRect(x+w-11,y+2,7,7);
  }
  else if (e.type==='phantomArcher') {
    ctx.fillStyle=e.col; ctx.fillRect(x+4,y,w-8,h);
    ctx.fillStyle='#504090'; ctx.fillRect(x+2,y+8,w-4,h-24);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+6,y+4,6,6); ctx.fillRect(x+w-12,y+4,6,6);
    ctx.strokeStyle='#8060a0'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x+w+2,y+h/2,12,Math.PI*0.3,Math.PI*1.7); ctx.stroke();
    ctx.fillStyle='#c0a040'; ctx.fillRect(x+w,y+h/2-1,12,3);
  }
  else if (e.type==='corruptedSoldier') {
    ctx.fillStyle='#403020'; ctx.fillRect(x+2,y,w-4,h);
    ctx.fillStyle=e.col; ctx.fillRect(x+6,y+6,w-12,h-16);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+7,y+3,7,7); ctx.fillRect(x+w-14,y+3,7,7);
    ctx.fillStyle='#504030'; ctx.fillRect(x+4,y-4,w-8,12);
    ctx.fillStyle='#8090a0'; ctx.fillRect(x+w,y+10,6,24);
    ctx.fillRect(x+w-2,y+8,10,4);
  }
  else if (e.type==='ironWarden') {
    ctx.fillStyle='#302818'; ctx.fillRect(x,y,w,h);
    ctx.fillStyle=e.col; ctx.fillRect(x+4,y+6,w-8,h-12);
    ctx.fillStyle='#706040';
    ctx.fillRect(x-6,y+4,14,16); ctx.fillRect(x+w-8,y+4,14,16);
    ctx.fillStyle='#504030';
    ctx.fillRect(x+6,y-6,w-12,14); ctx.fillRect(x+10,y+2,w-20,6);
    ctx.fillStyle=e.eyeCol;
    ctx.fillRect(x+12,y+2,8,8); ctx.fillRect(x+w-20,y+2,8,8);
    ctx.fillStyle='#806050';
    ctx.fillRect(x+w+2,y+h*0.3,8,h*0.4); ctx.fillRect(x+w-2,y+h*0.25,16,12);
    drawBossHP(e,'Iron Warden');
  }
  else if (e.type==='ashenKing') {
    const phase2=e.phase===2;
    ctx.fillStyle=phase2?'#602010':'#402010'; ctx.fillRect(x+2,y+20,w-4,h-20);
    ctx.fillStyle=phase2?'#e06020':e.col; ctx.fillRect(x+8,y+6,w-16,h-30);
    ctx.fillStyle=phase2?'#d05010':'#9a7040';
    ctx.fillRect(x-4,y+8,16,14); ctx.fillRect(x+w-12,y+8,16,14);
    ctx.fillStyle='#d4a017'; ctx.fillRect(x+8,y-10,w-16,10);
    for(let i=0;i<3;i++) { ctx.fillRect(x+10+i*12,y-18,6,10); }
    ctx.fillStyle='#c0a070'; ctx.fillRect(x+12,y-2,w-24,14);
    ctx.fillStyle=phase2?'#ff2200':e.eyeCol;
    ctx.fillRect(x+14,y+2,8,8); ctx.fillRect(x+w-22,y+2,8,8);
    if (phase2) {
      ctx.fillStyle='rgba(200,120,20,0.4)';
      for(let i=0;i<4;i++) {
        const a=Date.now()/300+i*1.57;
        ctx.fillRect(x+w/2+Math.cos(a)*30-4,y+h/2+Math.sin(a)*24-4,8,8);
      }
    }
    ctx.fillStyle='#c0c0d0'; ctx.fillRect(x+w+2,y+h*0.15,5,h*0.55);
    ctx.fillStyle='#d4a017'; ctx.fillRect(x+w-4,y+h*0.12,14,5);
    drawBossHP(e, phase2?'Ashen King — Phase II':'The Ashen King');
  }

  ctx.globalAlpha=1;
}

function drawBossHP(e, label) {
  ctx.globalAlpha=1;
  const bw=Math.min(100,e.w+44), bh=10;
  const bx=e.x+e.w/2-bw/2, by=e.y-22;
  ctx.fillStyle='#1a1010'; ctx.fillRect(bx,by,bw,bh);
  const pct=Math.max(0,e.hp/e.maxHp);
  const barCol = pct>0.5 ? '#c04010' : pct>0.25 ? '#e07020' : '#ff2020';
  ctx.fillStyle=barCol; ctx.fillRect(bx,by,bw*pct,bh);
  ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.strokeRect(bx,by,bw,bh);
  ctx.fillStyle='#ccaa88'; ctx.font='bold 10px monospace';
  ctx.textAlign='center'; ctx.fillText(label,e.x+e.w/2,by-4);
  ctx.textAlign='left';
}

// ═══════════════════════════════════════════════════════
//  DRAW COINS
// ═══════════════════════════════════════════════════════
function drawCoins(t) {
  const fd = FLOOR_DATA[state.floorIndex];
  state.coins.forEach(c => {
    const bob = Math.sin(c.bob + t/300) * 4;
    const cx = c.x, cy = c.y + bob;

    // Glow
    const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    grd.addColorStop(0, c.glow||'rgba(240,180,20,0.4)');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.fill();

    // Coin body
    ctx.fillStyle = c.col;
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2); ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx-2, cy-2, 3, 0, Math.PI*2); ctx.fill();

    // Platform coins show value badge
    if (c.value >= 2) {
      ctx.fillStyle = '#1a1208';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.value, cx, cy+3);
      ctx.textAlign = 'left';
    }
  });
}

// ═══════════════════════════════════════════════════════
//  DRAW FLOATING TEXTS
// ═══════════════════════════════════════════════════════
function drawFloatingTexts() {
  state.floatingTexts.forEach(ft => {
    const alpha = ft.life / ft.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.col;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x - state.camera.x, ft.y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

// ═══════════════════════════════════════════════════════
//  DRAW
// ═══════════════════════════════════════════════════════
function draw() {
  const fd=FLOOR_DATA[state.floorIndex];
  const cW=canvas.width, cH=canvas.height;
  const cx=Math.round(state.camera.x);
  const gY=cH-GROUND_H;
  const t=Date.now();

  ctx.fillStyle=fd.bgTop; ctx.fillRect(0,0,cW,cH*0.6);
  ctx.fillStyle=fd.bgBot; ctx.fillRect(0,cH*0.6,cW,cH*0.4);

  if (fd.fogColor) { ctx.fillStyle=fd.fogColor; ctx.fillRect(0,0,cW,cH); }

  ctx.save();
  ctx.translate(-cx,0);

  // Background pillars
  ctx.fillStyle=fd.wallColor;
  for (let i=0;i<10;i++) {
    const px=100+i*260;
    ctx.fillRect(px,gY-cH*0.7,22,cH*0.7);
    ctx.fillRect(px+238,gY-cH*0.5,14,cH*0.5);
    ctx.fillStyle=fd.accent+'40';
    ctx.fillRect(px,gY-cH*0.7,22,8);
    ctx.fillStyle=fd.wallColor;
  }

  // Faded floor number
  ctx.globalAlpha=0.04;
  ctx.fillStyle='#ffffff';
  ctx.font=`bold ${Math.min(cH*0.7,320)}px Georgia`;
  ctx.textAlign='center';
  ctx.fillText(fd.num, LEVEL_W/2, gY-10);
  ctx.textAlign='left';
  ctx.globalAlpha=1;

  // Torches
  state.torches.forEach(tor => {
    tor.flicker+=0.12;
    const flick=0.8+Math.sin(tor.flicker)*0.2;
    const grd=ctx.createRadialGradient(tor.x,tor.y,2,tor.x,tor.y,50*flick);
    grd.addColorStop(0,fd.torchColor+'55'); grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd; ctx.fillRect(tor.x-50,tor.y-50,100,100);
    ctx.fillStyle='#6a5040'; ctx.fillRect(tor.x-3,tor.y+2,6,14);
    ctx.fillStyle=fd.torchColor; ctx.fillRect(tor.x-3,tor.y-14*flick,6,14*flick);
    ctx.fillStyle='#ffffaa'; ctx.fillRect(tor.x-1,tor.y-10*flick,3,8*flick);
  });

  // Platforms
  state.platforms.forEach(pl => {
    if (pl.w>=LEVEL_W) {
      ctx.fillStyle=fd.groundColor; ctx.fillRect(pl.x,pl.y,pl.w,pl.h);
      ctx.fillStyle=fd.groundTop; ctx.fillRect(pl.x,pl.y,pl.w,6);
      ctx.fillStyle=fd.wallColor;
      for(let i=0;i<30;i++) ctx.fillRect(pl.x+i*90,pl.y+10,60,2);
    } else if (pl.w<100 && pl.h>40) {
      ctx.fillStyle=fd.wallColor; ctx.fillRect(pl.x,pl.y,pl.w,pl.h);
    } else if (pl.h===18) {
      ctx.fillStyle=fd.platColor; ctx.fillRect(pl.x,pl.y,pl.w,pl.h);
      ctx.fillStyle=fd.platTop; ctx.fillRect(pl.x,pl.y,pl.w,4);
      ctx.fillStyle=fd.accent+'80';
      ctx.fillRect(pl.x+10,pl.y,4,30); ctx.fillRect(pl.x+pl.w-14,pl.y,4,30);
    } else {
      // Partial ground islands (floor 4)
      ctx.fillStyle=fd.groundColor; ctx.fillRect(pl.x,pl.y,pl.w,pl.h);
      ctx.fillStyle=fd.groundTop; ctx.fillRect(pl.x,pl.y,pl.w,6);
    }
  });

  // Floor 3 hazard tiles — lava patches
  if (state.hazardTiles) {
    const t2 = Date.now();
    state.hazardTiles.forEach(h => {
      if (!h.active) {
        // Cooling — dim glow
        ctx.fillStyle='rgba(80,20,0,0.35)';
        ctx.fillRect(h.x,h.y,h.w,GROUND_H);
        return;
      }
      // Active lava
      const flicker = 0.7 + Math.sin(t2/80 + h.x)*0.3;
      ctx.fillStyle=`rgba(200,50,0,${0.85*flicker})`;
      ctx.fillRect(h.x,h.y,h.w,GROUND_H);
      ctx.fillStyle=`rgba(255,180,0,${0.5*flicker})`;
      ctx.fillRect(h.x+4,h.y,h.w-8,8);
      // Bubble particles
      if (Math.random()<0.12) {
        burst(h.x+Math.random()*h.w, h.y-4, '#ff6010', 2);
      }
    });
  }

  // Floor 4 — void darkness below platforms
  if (state.floorIndex===3) {
    ctx.fillStyle='rgba(2,2,8,0.65)';
    ctx.fillRect(0,gY-20,LEVEL_W,30);
  }

  // Shrines
  if (state.shrines) {
    state.shrines.forEach(s => {
      const t2=Date.now();
      const glow=0.5+Math.sin(t2/400)*0.3;
      // Shrine glow
      const sGrd=ctx.createRadialGradient(s.x+s.w/2,s.y+s.h/2,4,s.x+s.w/2,s.y+s.h/2,60);
      sGrd.addColorStop(0,`rgba(255,120,20,${glow*0.4})`); sGrd.addColorStop(1,'transparent');
      ctx.fillStyle=sGrd; ctx.fillRect(s.x-30,s.y-30,s.w+60,s.h+60);
      // Pedestal
      ctx.fillStyle='#3a2818'; ctx.fillRect(s.x,s.y+s.h-20,s.w,20);
      ctx.fillStyle='#5a3820'; ctx.fillRect(s.x+4,s.y+s.h-24,s.w-8,8);
      // Flask
      ctx.fillStyle='#ff8840';
      ctx.beginPath(); ctx.arc(s.x+s.w/2, s.y+s.h-36, 14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffcc66';
      ctx.beginPath(); ctx.arc(s.x+s.w/2-4, s.y+s.h-42, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#c06020'; ctx.fillRect(s.x+s.w/2-4,s.y+s.h-60,8,16);
      ctx.fillStyle='#a08050'; ctx.fillRect(s.x+s.w/2-4,s.y+s.h-64,8,5);
      // Shine
      ctx.fillStyle=`rgba(255,255,255,${0.25+glow*0.15})`;
      ctx.beginPath(); ctx.arc(s.x+s.w/2-5,s.y+s.h-40,5,0,Math.PI*2); ctx.fill();
      // Label
      ctx.fillStyle='#c07030'; ctx.font='bold 9px monospace';
      ctx.textAlign='center';
      ctx.fillText('SHRINE',s.x+s.w/2,s.y+s.h+12);
      ctx.fillText(`${DRAUGHT_COST}◈`,s.x+s.w/2,s.y+s.h+22);
      ctx.textAlign='left';
    });
  }

  // Door
  if (state.door) {
    const d=state.door;
    const open=d.open;
    ctx.fillStyle=open?'#b08020':'#5a4030';
    ctx.fillRect(d.x-6,d.y-6,d.w+12,d.h+6);
    ctx.fillStyle=open?'#fff8e0':'#1a1208';
    ctx.fillRect(d.x,d.y,d.w,d.h);
    if (!open) {
      ctx.fillStyle='#3a2418';
      ctx.fillRect(d.x+4,d.y+4,d.w-8,d.h/2-8);
      ctx.fillRect(d.x+4,d.y+d.h/2+4,d.w-8,d.h/2-8);
      ctx.fillStyle='#c08820';
      ctx.beginPath(); ctx.arc(d.x+d.w-10,d.y+d.h/2,4,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle='rgba(255,240,180,0.15)'; ctx.fillRect(d.x,d.y,d.w,d.h);
    }
    ctx.fillStyle=open?'#d4a017':'#887060';
    ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText(open?'EXIT →':'LOCKED',d.x+d.w/2,d.y-10);
    ctx.textAlign='left';
  }

  // Key item
  if (state.key) {
    const k=state.key;
    const bob=Math.sin(t/250)*5;
    ctx.save(); ctx.translate(k.x+12, k.y+12+bob);
    ctx.fillStyle='rgba(212,160,23,0.3)';
    ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#d4a017';
    ctx.beginPath(); ctx.arc(-4,0,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a1208';
    ctx.beginPath(); ctx.arc(-4,0,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#d4a017';
    ctx.fillRect(2,-3,16,6); ctx.fillRect(12,3,4,6); ctx.fillRect(16,3,4,4);
    ctx.restore();
  }

  // Coins
  drawCoins(t);

  // Particles
  state.particles.forEach(p => {
    ctx.globalAlpha=Math.max(0,p.life/40);
    ctx.fillStyle=p.col;
    ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
  });
  ctx.globalAlpha=1;

  // Projectiles
  state.projectiles.forEach(pr => {
    if (pr.fromPlayer) {
      ctx.fillStyle='#ffcc22';
      ctx.beginPath(); ctx.arc(pr.x,pr.y,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffffff88';
      ctx.beginPath(); ctx.arc(pr.x,pr.y,3,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle='#aa44ff';
      ctx.beginPath(); ctx.arc(pr.x,pr.y,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ff88ff88';
      ctx.beginPath(); ctx.arc(pr.x,pr.y,3,0,Math.PI*2); ctx.fill();
    }
  });

  state.enemies.forEach(e => drawEnemy(e));
  if (state.player) drawPlayer(state.player, t);

  ctx.restore();

  // Floating texts (screen space relative to camera)
  drawFloatingTexts();

  // Damage flash
  if (state.flashTimer>0) {
    ctx.fillStyle=`rgba(200,20,10,${state.flashTimer/14*0.4})`;
    ctx.fillRect(0,0,cW,cH);
  }

  // Shrine prompt (screen-space, near player)
  if (state.shrinePrompt && state.player) {
    const sp = state.player;
    const sx = sp.x - state.camera.x;
    const sy = sp.y - 50;
    const canAfford = totalCoins >= DRAUGHT_COST;
    ctx.fillStyle = canAfford ? 'rgba(255,130,30,0.92)' : 'rgba(100,60,30,0.85)';
    ctx.fillRect(sx-60, sy-18, 120, 22);
    ctx.fillStyle = canAfford ? '#fff8e0' : '#7a5a3a';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      canAfford ? `[E] Buy Draught (${DRAUGHT_COST}◈)` : `Need ${DRAUGHT_COST}◈`,
      sx, sy - 2
    );
    if (draughtHeld > 0) {
      ctx.fillStyle='rgba(80,40,10,0.85)'; ctx.fillRect(sx-50,sy+8,100,18);
      ctx.fillStyle='#ffaa44'; ctx.font='10px monospace';
      ctx.fillText(`[E] Use Draught (×${draughtHeld})`, sx, sy+20);
    }
    ctx.textAlign='left';
  } else if (draughtHeld > 0 && state.player && state.player.hp < state.player.maxHp*0.4) {
    // Pulse reminder when low HP and holding a draught
    const sp=state.player;
    const pulse=0.6+Math.sin(Date.now()/200)*0.4;
    ctx.fillStyle=`rgba(255,120,20,${pulse*0.85})`;
    const rx=sp.x-state.camera.x-55, ry=sp.y-50;
    ctx.fillRect(rx,ry,110,20);
    ctx.fillStyle='#fff'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText(`[E] Drink Draught (×${draughtHeld})`, sp.x-state.camera.x, ry+14);
    ctx.textAlign='left';
  }
}

// ═══════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════
function gameLoop() {
  const gameActive = document.getElementById('screen-game').classList.contains('active');
  if (gameActive && !state.gameOver && !state.win) {
    updatePlayer();
    updateEnemies();
    updateProjectiles();
    updateParticles();
    updateCoins();
    updateFloatingTexts();
    updateHazardTiles();
  }
  if (gameActive) draw();
  requestAnimationFrame(gameLoop);
}

// ═══════════════════════════════════════════════════════
//  START — shows title → floor intro → game
// ═══════════════════════════════════════════════════════
function startGame() {
  initState();
  showFloorIntro(0);
}

function goToTitle() {
  // Reset stale clear-screen state so Ascend can't fire from title
  _clearFloorIndex = -1;
  // Freeze game logic so the loop doesn't keep mutating state off-screen
  state.gameOver = true;
  state.win      = true;
  showScreen('screen-title');
}

function restartAndShowIntro() {
  // Retry same floor — keep coins (halved), go straight to intro first
  state.transitioningFloor = false;
  const floor = state.floorIndex;
  const coins = Math.floor(totalCoins * 0.5);
  const held  = draughtHeld;
  const used  = draughtUsed;
  initState();
  totalCoins  = coins;
  draughtHeld = held;
  draughtUsed = used;
  showFloorIntro(floor);
}

// ── Title buttons ──
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-how-to-play').addEventListener('click', () => showScreen('screen-howtoplay'));
document.getElementById('btn-htp-back').addEventListener('click', goToTitle);

// ── Floor intro buttons ──
document.getElementById('btn-intro-menu').addEventListener('click', goToTitle);

// ── Floor clear buttons ──
document.getElementById('btn-next-floor').addEventListener('click', () => {
  // Guard: only advance if we're actually on the floor-clear screen with a valid cleared floor
  if (!document.getElementById('screen-floor-clear').classList.contains('active')) return;
  if (_clearFloorIndex < 0) return;
  const nextIndex = _clearFloorIndex + 1;
  if (nextIndex >= FLOOR_DATA.length) return;
  state.floorIndex = nextIndex;
  showFloorIntro(nextIndex);
});
document.getElementById('btn-clear-menu').addEventListener('click', goToTitle);

// ── Win screen buttons ──
document.getElementById('btn-restart-win').addEventListener('click', startGame);
document.getElementById('btn-win-menu').addEventListener('click', goToTitle);

// ── Dead screen buttons ──
document.getElementById('btn-restart-dead').addEventListener('click', restartAndShowIntro);
document.getElementById('btn-dead-menu').addEventListener('click', goToTitle);

// ── Death flavor lines per floor ──
const DEATH_FLAVORS = [
  'The Gate holds. You did not.',
  'The dead of the Graveyard have one more guest.',
  'The Forge finds better use for your bones.',
  'The Abyss has no bottom. You found that out.',
  'The Ashen King remains on his throne.',
];
function setDeadFlavor() {
  const el = document.getElementById('dead-flavor');
  if (el) el.textContent = DEATH_FLAVORS[state.floorIndex] || 'The tower has claimed another soul.';
}

function showDeadScreen() {
  setDeadFlavor();
  showScreen('screen-dead');
}

// ── Win screen stats ──
function showWinScreen() {
  const statsEl = document.getElementById('win-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="clear-stat">
        <div class="clear-stat-val">${totalCoins}</div>
        <div class="clear-stat-label">Coins left</div>
      </div>
      <div class="clear-stat">
        <div class="clear-stat-val">${draughtUsed}</div>
        <div class="clear-stat-label">Draughts used</div>
      </div>`;
  }
  showScreen('screen-win');
}

initState();
gameLoop();
