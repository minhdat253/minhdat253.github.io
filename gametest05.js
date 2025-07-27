const gameStartTime = Date.now();

// ============================== BIẾN ================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bullets = [];
canvas.addEventListener("click", function(e) {
  // Với Plasma Rifle, click sẽ bắn viên nhỏ
  if (currentWeapon === "Plasma Rifle") {
    shootBullet(e);
  }
  // Với các súng còn lại (trừ Machine Gun vì nó bắn liên trong update)
  else if (currentWeapon !== "Machine Gun") {
    shootBullet(e);
  }
});

// Tạo mảng hộp súng, hộp đạn, lựu đạn, vụ nổ
const weaponBoxes = [];
const ammoBoxes = [];
const grenades = [];
const explosions = [];
const damages = []; // chứa các dame đang hiển thị
const notifications = []; // Mảng chứa các thông báo hiển thị trên màn hình
const weapons = ["Pistol", "Shotgun", "Laser Gun", "Machine Gun", "Plasma Rifle"];
let currentWeapon = "Pistol";  // mặc định

let gunRecoil = 0;
// Điều chỉnh các giá trị này để có hiệu ứng giật khác nhau cho từng loại súng
const WEAPON_RECOIL_AMOUNT = {
    "Pistol": 6,
    "Shotgun": 8, // Giật mạnh hơn
    "Laser Gun": 3,
    "Machine Gun": 4,
    "Plasma Rifle": 5
};
const RECOIL_SPEED = 0.8;

// Thời gian chớp sáng ở đầu nòng (ms)
const WEAPON_FLASH_DURATION = {
    "Pistol": 50,
    "Shotgun": 70, // Chớp lâu hơn một chút
    "Laser Gun": 30, // Chớp nhanh
    "Machine Gun": 60,
    "Plasma Rifle": 30
};
let lastGunFireTime = 0; // Thời điểm cuối cùng bắn bất kỳ khẩu súng nào


// Biến cho tính năng Dash/Tăng tốc
let isRightMouseDown = false; // Theo dõi trạng thái chuột phải
let isDashing = false;      // Kiểm tra xem người chơi có đang dash không
let dashDuration = 150;     // Thời gian dash (ms)
let dashSpeedMultiplier = 3.5; // Tốc độ dash (ví dụ: 2.5 lần tốc độ bình thường)
let dashCooldown = 2000;    // Thời gian hồi chiêu dash (ms)
let lastDashTime = 0;       // Thời điểm dash cuối cùng

// Mảng chứa các hạt khói
const particles = [];

// Biến cho hiệu ứng khói (điều chỉnh các giá trị này)
const PARTICLE_COUNT_PER_FRAME = 5; // Tăng số hạt khói mỗi frame (ví dụ: từ 2 lên 3 hoặc 4)
const PARTICLE_RADIUS_MIN = 2;      // Kích thước hạt khói nhỏ nhất
const PARTICLE_RADIUS_MAX = 6;      // Kích thước hạt khói lớn nhất
const PARTICLE_SPEED_MULTIPLIER = 1; // Tốc độ di chuyển của hạt khói (thử 1-2)
const PARTICLE_DECAY_RATE = 0.02;   // Tốc độ mờ dần của hạt khói (giảm giá trị này để khói tồn tại lâu hơn)
const PARTICLE_SHRINK_RATE = 0.05;  // Tốc độ nhỏ dần của hạt khói (giảm giá trị này để khói biến mất chậm hơn)

let isMouseDown = false;
canvas.addEventListener("mousedown", () => {
  isMouseDown = true;
});
canvas.addEventListener("mouseup", () => {
  isMouseDown = false;
});

canvas.addEventListener("mousedown", function(e) {
  if (e.button === 0) {
    isMouseDown = true;

    if (currentWeapon === "Plasma Rifle") {
      isChargingPlasma = true;
      plasmaChargeStartTime = Date.now();
      plasmaChargeStarted = false;
      plasmaFullyChargedPlayed = false; // 👈 reset để chuẩn bị phát lại âm ding nếu sạc đầy
    }
  } else if (e.button === 2) {
    isRightMouseDown = true;
    startDash();
  }
});

canvas.addEventListener("mouseup", function(e) {
  if (e.button === 0) {
    isMouseDown = false;

    if (currentWeapon === "Plasma Rifle" && isChargingPlasma) {
      isChargingPlasma = false;

      // 👇 Tắt âm sạc khi nhả chuột
      plasmaChargeSound.pause();
      plasmaChargeSound.currentTime = 0;
      plasmaChargeStarted = false;
      if (plasmaChargeAmount >= MAX_PLASMA_CHARGE && ammo["Plasma Rifle"] >= 2) {
        shootBigPlasmaBullet(lastMouse.x, lastMouse.y);
        justFiredBigPlasma = true;
        plasmaChargeAmount = 0;
      } else {
        plasmaChargeAmount = 0;
      }
    }
  }
});

const ammo = {
  "Pistol": 20,
  "Shotgun": 10,
  "Laser Gun": 30,
  "Machine Gun": 30,
  "Plasma Rifle": 20, //20
  "Grenade": 1
};
const player = {
  x: 400,
  y: 300,
  radius: 20,
  color: "cyan",
  speed: 3,
  hp: 100,
  maxHp: 100
};

const weaponStats = {
  "Pistol": { ammo: 20, damage: 15, ammoPerBox: 10 },      // +10 đạn mỗi hộp
  "Shotgun": { ammo: 10, damage: 6, ammoPerBox: 8 },       // +8 đạn mỗi hộp
  "Laser Gun": { ammo: 30, damage: 12, ammoPerBox: 15 },  // +15 đạn mỗi hộp
  "Machine Gun": { ammo: 30, damage: 5, ammoPerBox: 25 }, // +25 đạn mỗi hộp
  "Plasma Rifle": { ammo: 20, damage: 15, ammoPerBox: 25}, // +10 đạn mỗi hộp
  "Grenade": { ammo: 1, damage: 30, radius: 150 } // Lựu đạn reset về 2 
};


// Âm thanh
const shootSound = new Audio("sound/gunshot.mp3");
const hitSound = new Audio("sound/punch.mp3");
const damageSound = new Audio("sound/character.mp3");
const reloadSound = new Audio("sound/reload.mp3");
const shotgunSound = new Audio("sound/shotgun.mp3");
const laserSound = new Audio("sound/blaster.mp3");
const machineGunSound = new Audio("sound/machinegun1.mp3");
const explosionSound = new Audio("sound/explosion.mp3");
const dashSound = new Audio("sound/boost2.mp3"); 
const bossAlertSound = new Audio("sound/dangerboss.mp3");
const endingMusic = new Audio("sound/ending_game.mp3");
const shieldBoostSound = new Audio("sound/shieldboost.mp3");
const shieldActivateSound = new Audio("sound/shield_on.mp3");
const healthPacksSound = new Audio("sound/healthpack.mp3");
shootSound.load();
hitSound.volume = 0.5; hitSound.load();
damageSound.volume = 0.5; damageSound.load();
reloadSound.load();
shotgunSound.volume = 0.5; shotgunSound.load();
laserSound.volume = 0.4; laserSound.load();
machineGunSound.playbackRate = 8.5; machineGunSound.load();
explosionSound.volume = 0.3;
dashSound.volume = 0.4; dashSound.load(); 
bossAlertSound.volume = 0.5; bossAlertSound.load();
endingMusic.volume = 0.7; endingMusic.load();
endingMusic.addEventListener("ended", () => {
  endingMusic.currentTime = 0;
  endingMusic.play();
});
shieldBoostSound.currentTime = 0; // tua về đầu nếu chưa kết thúc
shieldBoostSound.play(); shieldBoostSound.load();
healthPacksSound.load();

const plasmaSmallSound = new Audio("sound/plasma_small.mp3"); 
const plasmaChargeSound = new Audio("sound/plasma_charge.mp3"); plasmaChargeSound.volume = 0.4;
const plasmaDingSound = new Audio("sound/plasma_ding.mp3"); plasmaDingSound.volume = 0.4; 
const plasmaBigSound = new Audio("sound/plasma_big.mp3"); plasmaBigSound.volume = 0.6; //0.6
plasmaSmallSound.load();
plasmaChargeSound.load();
plasmaDingSound.load();
plasmaBigSound.load();

// ============================== CÁC HÀM ================================


// ============== HÀM THUỘC VỀ SÚNG PLASMA ======================== 
// Hướng di chuyển của chuột 
let lastMouse = { x: player.x + 100, y: player.y };
canvas.addEventListener("mousemove", function(e) {
  const rect = canvas.getBoundingClientRect();
  lastMouse.x = e.clientX - rect.left;
  lastMouse.y = e.clientY - rect.top;
});

// Biến cho Plasma Rifle
let isChargingPlasma = false; // Theo dõi người chơi có đang giữ chuột trái để tích tụ plasma không
let plasmaChargeAmount = 0;   // Mức năng lượng plasma đã tích tụ (0 đến 100)
const MAX_PLASMA_CHARGE = 100; // Mức tích tụ tối đa
const CHARGE_RATE = 2;       // Tốc độ tích tụ năng lượng mỗi frame
const DRAIN_RATE = 5;        // Tốc độ giảm năng lượng khi nhả chuột nhưng chưa đủ ngưỡng
// const OVERCHARGE_PENALTY_TIME = 1000; // Thời gian phạt khi tích tụ quá ngưỡng (ms)
// let overchargeTime = 0; // Thời điểm bắt đầu phạt
const PLASMA_CHARGE_THRESHOLD = 70; // Ngưỡng tối thiểu để bắn đạn lớn
let justFiredBigPlasma = false; // <-- THÊM DÒNG NÀY

let lastPlasmaSmallShot = 0;
const plasmaSmallFireRate = 150; // Tốc độ bắn đạn nhỏ Plasma
let plasmaChargeStartTime = 0;
let plasmaChargeStarted = false;

function drawBullets() {
    bullets.forEach(b => {
        if (b.type === "laser_beam") { // Nếu có loại đạn laser đặc biệt (chưa có trong code này)
            // drawLaserBeam(b.x, b.y, b.targetX, b.targetY, b.color, b.width);
        } else if (b.type === "boss_projectile") { // Nếu có đạn của boss
            drawCircle(b);
        }
        else { // Mặc định là hình tròn
            drawCircle(b);
        }
    });
}
// ================================================================== 


let score = 0;
const zombies = [];
let lastMutantSpawnTime = 0;
const fireTrails = [];
let zombieSpawnInterval;

// Sinh ra zombie mỗi 500ms 
function spawnZombie() {
  const now = Date.now();
  const elapsedSinceLastMutant = (now - lastMutantSpawnTime) / 1000;

  // Mỗi 20 giây sinh ra 1 zombie đột biến
  if (elapsedSinceLastMutant >= 25) {
    spawnMutantZombie();
    lastMutantSpawnTime = now;
    return; // Không sinh zombie thường trong lần gọi này
  }

  // Ngược lại, sinh zombie thường
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * canvas.width; y = 0; }
  else if (edge === 1) { x = Math.random() * canvas.width; y = canvas.height; }
  else if (edge === 2) { x = 0; y = Math.random() * canvas.height; }
  else { x = canvas.width; y = Math.random() * canvas.height; }

  zombies.push({
    x,
    y,
    radius: 15,
    speed: 1,
    color: "green",
    hp: 3,
    type: "normal"
  });
}

function spawnMutantZombie() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * canvas.width; y = 0; }
  else if (edge === 1) { x = Math.random() * canvas.width; y = canvas.height; }
  else if (edge === 2) { x = 0; y = Math.random() * canvas.height; }
  else { x = canvas.width; y = Math.random() * canvas.height; }

  zombies.push({
    x,
    y,
    radius: 22,
    speed: 0.8,
    color: "darkred",
    hp: 45,
    maxHp: 30,
    type: "mutant"
  });
}

function updateZombieSpawnRate() {
  if (zombieSpawnInterval) clearInterval(zombieSpawnInterval);
  // Nếu có boss → spawn chậm lại
  const delay = boss ? 1500 : 500;
  zombieSpawnInterval = setInterval(spawnZombie, delay);
}

// Zombie di chuyển  về phía player
function moveZombies() {
  for (let z of zombies) {
    const dx = player.x - z.x;
    const dy = player.y - z.y;
    const dist = Math.hypot(dx, dy);
    z.x += (dx / dist) * z.speed;
    z.y += (dy / dist) * z.speed;

    // Zombie đột biến để lại lửa
    if (z.type === "mutant") {
      fireTrails.push({
        x: z.x,
        y: z.y,
        radius: 12,
        createdAt: Date.now()
      });
    }
    
    if (dist < player.radius + z.radius) {
     // Zombie đột biến gây nhiều sát thương hơn
    if (z.type === "mutant") {
      player.hp -= 0.5;
    } else {
      player.hp -= 0.1;
    }
    if (damageSound.paused) {
      damageSound.currentTime = 0;
      damageSound.play();
    }
}

  }
}

// Kỹ năng Khiên
let isShieldActive = false;
let shieldDuration = 1500; // 1.5 giây hiệu lực
let shieldCooldown = 10000; // 10 giây hồi chiêu
let lastShieldTime = -shieldCooldown; // để có thể dùng ngay lúc đầu nếu muốn
let shieldActivatedTime = 0;

const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keydown", e => {
  if (e.key === "g") {
    throwGrenade();
  }
  if (e.key === "t" || e.key === "T") {
    activateShield();
  }
});
window.addEventListener("keyup", e => keys[e.key] = false);

function throwGrenade() {
  if (ammo["Grenade"] > 0) {
    const angle = Math.atan2(lastMouse.y - player.y, lastMouse.x - player.x);
    grenades.push({
      x: player.x,
      y: player.y,
      radius: 6,
      dx: Math.cos(angle) * 4,
      dy: Math.sin(angle) * 4,
      timer: 1000,
      spawnTime: Date.now()
    });
    ammo["Grenade"]--;
  }
}

function movePlayer() {
  if (keys["w"] || keys["ArrowUp"]) player.y -= player.speed;
  if (keys["s"] || keys["ArrowDown"]) player.y += player.speed;
  if (keys["a"] || keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;

  // Giới hạn player trong canvas
  if (player.x - player.radius < 0) player.x = player.radius;
  if (player.x + player.radius > canvas.width) player.x = canvas.width - player.radius;
  if (player.y - player.radius < 0) player.y = player.radius;
  if (player.y + player.radius > canvas.height) player.y = canvas.height - player.radius;
}

function drawCircle(obj) {
  ctx.beginPath();
  ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
  ctx.fillStyle = obj.color;
  ctx.fill();
}

function drawPlayer() {
  drawCircle(player);
}

function drawGun() {
    const mouseX = lastMouse.x;
    const mouseY = lastMouse.y;
    const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(angle);

    // Xử lý giật của súng
    let currentGunOffset = 0;
    if (gunRecoil > 0) {
        currentGunOffset = -gunRecoil; // Đẩy súng về phía sau
    }
    ctx.fillStyle = "gray";
    ctx.fillRect(currentGunOffset, -5, 20, 10); // Thân súng
    // Màu của đầu nòng
    let muzzleColor = "#4682B4";
    // Kiểm tra nếu vừa bắn (trong thời gian FLASH_DURATION của vũ khí hiện tại)
    if (Date.now() - lastGunFireTime < WEAPON_FLASH_DURATION[currentWeapon]) {
        muzzleColor = "yellow";
    }
    ctx.fillStyle = muzzleColor;
    ctx.fillRect(20 + currentGunOffset, -2, 10, 4); // Đầu nòng (thay đổi vị trí theo offset)
    ctx.beginPath();
    ctx.arc(30 + currentGunOffset, 0, 3, 0, Math.PI * 2); // Đầu nòng tròn (thay đổi vị trí theo offset)
    ctx.fillStyle = muzzleColor; // Màu đầu nòng tròn
    ctx.fill();
    ctx.restore();
}

function getMuzzleWorldPosition() {
  const angle = Math.atan2(lastMouse.y - player.y, lastMouse.x - player.x);
  const offsetX = 30; // đúng với `ctx.fillRect(20, -2, 10, 4)` => đầu nòng nằm ở x = 30
  const offsetY = 0;  // vì fillRect nằm giữa trục Y
  return {
    x: player.x + Math.cos(angle) * offsetX - Math.sin(angle) * offsetY,
    y: player.y + Math.sin(angle) * offsetX + Math.cos(angle) * offsetY
  };
}

// Cách hàm đạn di chuyển
function moveBullets() {
    const now = Date.now();
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.dx;
        b.y += b.dy;
        // Kiểm tra nếu đạn shotgun và đã hết thời gian tồn tại
        if (b.lifeTime && (now - b.spawnTime > b.lifeTime)) {
            bullets.splice(i, 1);
            continue; // Chuyển sang viên đạn tiếp theo sau khi xóa
        }
        // Kiểm tra nếu đạn ra ngoài màn hình (áp dụng cho tất cả các loại đạn)
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
          if (b.type === "plasma") {
            plasmaSmallSound.pause();
            plasmaSmallSound.currentTime = 0;
          }
        bullets.splice(i, 1);
      }
    }
}

function spawnWeaponBox() {
  weaponBoxes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 12,
    weapon: weapons[Math.floor(Math.random() * weapons.length)],
    spawnTime: Date.now() // ➕ Thêm thời gian tạo
  });
}
function spawnAmmoBox() {
  ammoBoxes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 10,
    spawnTime: Date.now()
  });
}

// mỗi 10 giây spawn 1 hộp súng
setInterval(spawnWeaponBox, 10000);
setInterval(spawnAmmoBox, 7000);

// Spawn bình máu
const healthPacks = [];
function spawnHealthPack(x, y) {
  healthPacks.push({
    x,
    y,
    radius: 10,
    color: "limegreen",
    spawnTime: Date.now()
  });
}

function drawHealthPacks() {
  for (let pack of healthPacks) {
    ctx.beginPath();
    ctx.arc(pack.x, pack.y, pack.radius, 0, Math.PI * 2);
    ctx.fillStyle = pack.color;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("+HP", pack.x, pack.y + 3);
  }
}

function handleHealthPackCollision() {
  for (let i = healthPacks.length - 1; i >= 0; i--) {
    const pack = healthPacks[i];
    const dist = Math.hypot(player.x - pack.x, player.y - pack.y);

    if (dist < player.radius + pack.radius) {
      player.hp = Math.min(player.hp + 20, player.maxHp); // Hồi 20 HP, không vượt quá max
      healthPacksSound.currentTime = 0;
      healthPacksSound.play();
      healthPacks.splice(i, 1);

      notifications.push({
        lines: [
          { text: "+20 HP", color: "lime" }
        ],
        x: canvas.width / 2,
        y: canvas.height / 1.4,
        alpha: 1.0,
        startTime: Date.now(),
        duration: 1500
      });
    }
  }
}




// Tạo hình dáng hộp súng 
function drawWeaponBoxes() {
  for (let box of weaponBoxes) {
    ctx.beginPath();
    ctx.arc(box.x, box.y, box.radius, 0, Math.PI * 2);
    ctx.fillStyle = "gold";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Gun", box.x - 10, box.y + 3);
  }
}
// Tạo hình dáng hòm đạn 
function drawAmmoBoxes() {
  for (let box of ammoBoxes) {
    ctx.beginPath();
    ctx.arc(box.x, box.y, box.radius, 0, Math.PI * 2);
    ctx.fillStyle = "blue";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(" Đạn", box.x - 12, box.y + 3);
  }
}

// Xử lý va chạm giữa player và hộp súng
function handleWeaponBoxCollision() {
    for (let i = weaponBoxes.length - 1; i >= 0; i--) {
        const box = weaponBoxes[i];
        const dx = player.x - box.x;
        const dy = player.y - box.y;
        const dist = Math.hypot(dx, dy);

        if (dist < player.radius + box.radius) {
            let weaponToEquip = box.weapon; // Vũ khí mà hộp súng ban đầu cung cấp

            // Kiểm tra nếu vũ khí trong hộp trùng với vũ khí đang dùng
            if (weaponToEquip === currentWeapon) {
                // Lọc ra các vũ khí còn lại (không bao gồm vũ khí hiện tại và "Grenade")
                const availableWeapons = weapons.filter(weapon => weapon !== currentWeapon && weapon !== "Grenade");
                if (availableWeapons.length > 0) {
                    weaponToEquip = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
                } else {
                    // Để rỗng
                }
            }
            // Cập nhật vũ khí hiện tại
            currentWeapon = weaponToEquip;
            // ⛔ Nếu đổi từ Plasma Rifle sang súng khác khi đang sạc
            if (isChargingPlasma || plasmaChargeStarted || plasmaChargeAmount > 0) {
              isChargingPlasma = false;
              plasmaChargeStarted = false;
              plasmaChargeAmount = 0;
              plasmaChargeSound.pause();
              plasmaChargeSound.currentTime = 0;
            }
            ammo[currentWeapon] = weaponStats[currentWeapon].ammo; 
            reloadSound.play();
            // --- THÊM DÒNG NÀY ĐỂ TẠO THÔNG BÁO ---
            notifications.push({
                text: currentWeapon.toUpperCase(), // Chuyển tên súng sang chữ hoa
                x: canvas.width / 2, // Vị trí giữa màn hình
                y: canvas.height / 1.3,
                alpha: 1.0, // Độ mờ ban đầu
                startTime: Date.now(),
                duration: 1500 // Thời gian hiển thị (1.5 giây)
            });
            // ------------------------------------
            weaponBoxes.splice(i, 1);
        }
    }
}

function handleAmmoBoxCollision() {
    for (let i = ammoBoxes.length - 1; i >= 0; i--) {
        const box = ammoBoxes[i];
        const dx = player.x - box.x;
        const dy = player.y - box.y;
        const dist = Math.hypot(dx, dy);

        if (justFiredBigPlasma) {
        justFiredBigPlasma = false;
        return; // Thoát khỏi shootBullet, không bắn đạn nhỏ
        }

        if (dist < player.radius + box.radius) {
            // Reset lựu đạn về tối đa
            ammo["Grenade"] = weaponStats["Grenade"].ammo;

            // Cộng dồn đạn nếu không phải lựu đạn
            if (currentWeapon !== "Grenade") {
                const ammoToAdd = weaponStats[currentWeapon].ammoPerBox || 10;
                ammo[currentWeapon] += ammoToAdd; // Cộng dồn không giới hạn
            }

            reloadSound.currentTime = 0;
            reloadSound.play();
            ammoBoxes.splice(i, 1);
        }
    }
}

// Hàm tạo hình dáng của từng viên đạn 
function shootBullet(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
  let canShoot = false; // Biến cờ để kiểm tra có thể bắn hay không
  const muzzle = getMuzzleWorldPosition();

  if (currentWeapon === "Pistol" && ammo["Pistol"] > 0) {
    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      radius: 5,
      speed: 10,
      dx: Math.cos(angle) * 5,
      dy: Math.sin(angle) * 5,
      color: "yellow",
      damage: weaponStats[currentWeapon].damage,
      type: "pistol"
    });
    ammo["Pistol"]--;
    shootSound.currentTime = 0;
    shootSound.play();
    canShoot = true;
  } else if (currentWeapon === "Shotgun" && ammo["Shotgun"] > 0) {
    for (let i = -1; i <= 1; i++) {
      const spread = angle + i * 0.2;
      bullets.push({
        x: muzzle.x,
        y: muzzle.y,
        radius: 4,
        speed: 7,
        dx: Math.cos(spread) * 5,
        dy: Math.sin(spread) * 5,
        color: "orange",
        damage: weaponStats[currentWeapon].damage,
        type: "shotgun",
        lifeTime: 1000, // Thêm dòng này: Thời gian tồn tại của đạn shotgun (ms)
        spawnTime: Date.now() // Thêm dòng này: Thời điểm viên đạn được tạo ra
      });
    }
    ammo["Shotgun"]--;
    shotgunSound.currentTime = 0;
    shotgunSound.play();
    canShoot = true;
  } else if (currentWeapon === "Laser Gun" && ammo["Laser Gun"] > 0) {
    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      radius: 3,
      speed: 10,
      dx: Math.cos(angle) * 10,
      dy: Math.sin(angle) * 10,
      color: "cyan",
      type: "laser",
      damage: weaponStats[currentWeapon].damage
    });
    ammo["Laser Gun"]--;
    laserSound.currentTime = 0;
    laserSound.play();
    canShoot = true;
  } else if (currentWeapon === "Machine Gun" && ammo["Machine Gun"] > 0) {
    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      radius: 4,
      speed: 7,
      dx: Math.cos(angle) * 7,
      dy: Math.sin(angle) * 7,
      color: "red",
      damage: weaponStats["Machine Gun"].damage,
      type: "machinegun"
    });
    ammo["Machine Gun"]--;
    machineGunSound.currentTime = 0;
    machineGunSound.play();
  } // THAY THẾ TOÀN BỘ LOGIC PLASMA RIFLE BÊN TRONG shootBullet CŨ BẰNG ĐOẠN NÀY
else if (currentWeapon === "Plasma Rifle" && ammo["Plasma Rifle"] > 0 && !justFiredBigPlasma) {
    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      radius: 3,
      speed: 10,
      dx: Math.cos(angle) * 10,
      dy: Math.sin(angle) * 10,
      color: "yellow",
      type: "plasma",
      damage: weaponStats[currentWeapon].damage
    });
    ammo["Plasma Rifle"]--;
    laserSound.currentTime = 0;
    laserSound.play();
    plasmaSmallSound.currentTime = 0;
    plasmaSmallSound.play();
    canShoot = true;
  }
  else if (currentWeapon === "Grenade" && ammo["Grenade"] > 0) {
    grenades.push({
        x: player.x,
        y: player.y,
        radius: 6,
        dx: Math.cos(angle) * 4,
        dy: Math.sin(angle) * 4,
        timer: 700, // phát nổ sau 700 ms giây
        spawnTime: Date.now()
  });
  ammo["Grenade"]--;
  canShoot = true;
    }
  if (canShoot && currentWeapon !== "Grenade") {
        gunRecoil = WEAPON_RECOIL_AMOUNT[currentWeapon]; // Kích hoạt giật theo từng loại súng
        lastGunFireTime = Date.now(); // Ghi lại thời điểm bắn
  }
}

// Hàm bắn đạn lớn của Plasma Rifle (chỉ gọi khi nhả chuột sau khi sạc đủ)
function shootBigPlasmaBullet(targetX, targetY) {
    const muzzle = getMuzzleWorldPosition();
    if (player.hp <= 0) return;

    // Đạn lớn tiêu tốn 5 viên đạn thường
    if (ammo["Plasma Rifle"] >= 2) {
        const angle = Math.atan2(targetY - player.y, targetX - player.x);
        bullets.push({
            x: muzzle.x,
            y: muzzle.y,
            radius: 12, // Kích thước lớn hơn cho đạn plasma mạnh
            speed: 15, // Tốc độ cao hơn
            dx: Math.cos(angle) * 15,
            dy: Math.sin(angle) * 15,
            color: "deepskyblue", // Màu xanh nước biển cho đạn lớn
            damage: weaponStats["Plasma Rifle"].damage * 5, // Gấp đôi sát thương hoặc hơn
            type: "plasma_big" // Loại đạn lớn
        });
        ammo["Plasma Rifle"] -= 2; // Tiêu tốn 2 viên đạn thường
        plasmaBigSound.currentTime = 0;
        plasmaBigSound.play();
        gunRecoil = WEAPON_RECOIL_AMOUNT["Plasma Rifle"] * 1.7; // Giật mạnh hơn
        lastGunFireTime = Date.now();
    } else {
        // Thông báo khi không đủ đạn lớn vẫn được giữ lại
        notifications.push({
            // text: "KHÔNG ĐỦ ĐẠN LỚN!",
            x: canvas.width / 2,
            y: canvas.height / 1.5,
            alpha: 1.0,
            startTime: Date.now(),
            duration: 1000,
            color: "255, 255, 0" // Màu vàng
        });
    }
}
let lastMachineGunShot = 0;
const machineGunFireRate = 100; // 100 ms mỗi viên ~ 10 viên/giây

// Tùy chỉnh hàm xử lý va chạm giữa đạn và zombie 
function handleBulletZombieCollision() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
      // ➕ Kiểm tra cả đạn Boss phản lại
    if (!b.damage) continue; // Bỏ qua nếu không có damage (phòng lỗi)
    for (let j = zombies.length - 1; j >= 0; j--) {
      const z = zombies[j];
      const dx = b.x - z.x;
      const dy = b.y - z.y;
      const dist = Math.hypot(dx, dy);
      if (dist < b.radius + z.radius) {
        if (b.type === "plasma") {
          plasmaSmallSound.pause();
          plasmaSmallSound.currentTime = 0;
        }
        bullets.splice(i, 1);
        z.hp -= b.damage;
        hitSound.currentTime = 0;
        hitSound.play();
        damages.push({
        x: z.x,
        y: z.y,
        amount: b.damage,
        startTime: Date.now()
      });

  // if (z.hp <= 0) {
  //   zombies.splice(j, 1);
  //   score++;
  // }
  if (z.hp <= 0) {
  if (z.type === "mutant") {
    spawnShieldBox(z.x, z.y);
  }
  zombies.splice(j, 1);
  score++;
  }
  break;
}
    }
  }
}

// Tạo Nade (Lựu đạn)
function moveGrenades() {
  for (let g of grenades) {
    g.x += g.dx;
    g.y += g.dy;
  }
}

function handleGrenadeExplosions() {
  const now = Date.now();
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    if (now - g.spawnTime >= g.timer) {
      // Phát nổ
      for (let j = zombies.length - 1; j >= 0; j--) {
        const z = zombies[j];
        const dist = Math.hypot(z.x - g.x, z.y - g.y);
        if (dist < 150) { // bán kính nổ
          const damage = 30; // chỉnh sát thương tùy ý
          z.hp -= damage;

          // Hiệu ứng số damage hiện ra
          damages.push({
            x: z.x,
            y: z.y,
            amount: damage,
            startTime: Date.now()
          });

          if (z.hp <= 0) {
            zombies.splice(j, 1);
            score++;
            hitSound.currentTime = 0;
            hitSound.play();
          }
        }
      }
      explosionSound.currentTime = 0;
      explosionSound.play();
      explosions.push({
        x: g.x,
        y: g.y,
        radius: 0,
        maxRadius: 149,
        alpha: 1.0,
        createdAt: now
      });
      grenades.splice(i, 1);
    }
  }
}

function drawDamages() {
  const now = Date.now();
  for (let i = damages.length - 1; i >= 0; i--) {
    const d = damages[i];
    const elapsed = now - d.startTime;
    if (elapsed > 600) {
      damages.splice(i, 1); // xoá sau 600ms
      continue;
    }
    const alpha = 1 - elapsed / 600;
    const yOffset = -elapsed / 10; // bay lên
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.font = "18px sans-serif";
    ctx.fillText("-" + d.amount, d.x, d.y + yOffset);
  }
}

function drawExplosions() {
  const now = Date.now();
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i];
    const elapsed = now - ex.createdAt;
    const progress = elapsed / 400; // hiệu ứng kéo dài 400ms
    ex.radius = ex.maxRadius * progress;
    ex.alpha = 1 - progress;

    if (progress >= 1) {
      explosions.splice(i, 1); // Xoá khi xong hiệu ứng
      continue;
    }
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    ctx.fillStyle =  `rgba(255, 100, 100, ${ex.alpha})`; // cam mờ
    ctx.fill();
  }
}

function drawGrenades() {
  for (let g of grenades) {
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fillStyle = "darkgray";
    ctx.fill();
  }
}

// Thanh máu (HP Bar)
function drawHPBar() {
  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, 200, 20);
  ctx.fillStyle = "lime";
  ctx.fillRect(20, 20, (player.hp / 100) * 200, 20);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 200, 20);
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(Math.ceil(player.hp) + " / " + player.maxHp, 90, 35);
}

// Ghi điểm 
function drawScore() {
    ctx.textAlign = "left"; // đảm bảo text nằm sát trái đúng vị trí
    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";
    ctx.fillText("Score: " + score, 20, 60);
    ctx.fillText("Bullet: " + ammo[currentWeapon], 20, 85);
    ctx.fillText("Grenade: " + ammo["Grenade"], 20, 110); // Dòng mới để hiển thị số lựu đạn
}

function drawDebugInfo() {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Số đạn còn lại: " + bullets.length, 10, 20);
}


// ==================== TẠO BOSS ==================== 
let boss = null;
let nextBossScore = 20;       // Điểm để boss đầu tiên xuất hiện với 20 điểm
const bossScoreStep = 200;     // Boss xuất hiện mỗi 150 điểm sau đó
let bossBullets = [];
let bossShootInterval;
let bossCount = 0; // Biến đếm số Boss đã xuất hiện

const bossColors = ["purple", "crimson", "darkorange", "GreenYellow", "#FF6A6A", "#97FFFF", "#FF3300", "#FFB90F"];
function spawnBoss() {
    bossCount++; // Tăng số lượng boss
    const bossName = `Z25-BOSS-${String(bossCount).padStart(2, '0')}`; // Tên boss dạng Z25-BOSS-01, Z25-BOSS-02...
    const bossColor = bossColors[(bossCount - 1) % bossColors.length]; // ✅ Đổi màu dựa vào bossCount
    // HP tăng theo số boss
    const baseBossHP = 300;
    const extraHPPerBoss = 200;
    const bossHP = baseBossHP + (bossCount - 1) * extraHPPerBoss;
  boss = {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 50,
    color: bossColor, // 👈 gán màu mới
    hp: bossHP,
    speed: 0.5,
    name: bossName // 👈 Gán tên boss
  };
  // Thông báo xuất hiện boss (bao gồm tên boss)
  notifications.push({
    text: `👹 ${bossName} XUẤT HIỆN 👹`,
    x: canvas.width / 2,
    y: canvas.height / 1.5,
    alpha: 1.0,
    startTime: Date.now(),
    duration: 2000,
    color: "255, 0, 0" // 👈 màu đỏ (RGB)
  });
  bossAlertSound.currentTime = 0; // Phát lại từ đầu nếu đã chơi trước đó
  bossAlertSound.play();
  // Bắt đầu interval bắn đạn
  bossShootInterval = setInterval(bossShoot, 1000);
  updateZombieSpawnRate(); // 👈 THÊM vào đây
}

function moveBoss() {
  if (!boss) return;
  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  const dist = Math.hypot(dx, dy);
  boss.x += (dx / dist) * boss.speed;
  boss.y += (dy / dist) * boss.speed;

  // Boss gây sát thương nếu chạm người chơi
  if (dist < boss.radius + player.radius) {
    player.hp -= 0.3;
    if (damageSound.paused) {
      damageSound.currentTime = 0;
      damageSound.play();
    }
  }
}

function drawBoss() {
  if (!boss) return;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
  ctx.fillStyle = boss.color;
  ctx.fill();
    // Hiển thị tên boss dưới thân nó
  if (boss.name) {
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(boss.name, boss.x, boss.y + boss.radius + 18);
  }
}

function drawBossHPBar() {
  if (!boss) return;

  const barWidth = 400;
  const barHeight = 10;
  const barX = canvas.width / 2 - barWidth / 2;
  const barY = 60;

  // Vẽ nền
  ctx.fillStyle = "rgba(65, 65, 65, 0.7)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Tính phần trăm máu boss (cần lấy theo boss.hp hiện tại / max HP ban đầu của boss đó)
  const bossMaxHP = 300 + (bossCount - 1) * 200;
  const hpPercent = boss.hp / bossMaxHP;

  // Vẽ phần máu còn lại
  ctx.fillStyle = "crimson";
  ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

  // Viền
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // ✅ Hiển thị số máu: ví dụ "HP: 840 / 900"
  ctx.font = "14px Arial";
  ctx.textAlign = "center"; // reset để không ảnh hưởng sau đó
  ctx.fillText(`HP: ${Math.max(0, Math.ceil(boss.hp))} / ${bossMaxHP}`, barX + barWidth / 2, barY + barHeight + 16);
}

const bossDeathSound = new Audio("sound/evil_laugh.mp3");
bossDeathSound.load();
function handleBulletBossCollision() {
  if (!boss) return;

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (!b.damage) continue;
    const dx = b.x - boss.x;
    const dy = b.y - boss.y;
    const dist = Math.hypot(dx, dy);

    if (dist < b.radius + boss.radius) {
      bullets.splice(i, 1); // Xoá đạn

      boss.hp -= b.damage;

      // Hiện số sát thương
      damages.push({
        x: boss.x,
        y: boss.y,
        amount: b.damage,
        startTime: Date.now()
      });

      // Phát âm thanh trúng đạn
      hitSound.currentTime = 0;
      hitSound.play();

      if (boss.hp <= 0) {
        spawnHealthPack(boss.x, boss.y);
        weaponStats["Grenade"].ammo++;
        // ➕ Thưởng 1 lựu đạn khi tiêu diệt Boss
      ammo["Grenade"]++;
      notifications.push({
      lines: [
        { text: "+1 ô chứa Grenade", color: "orange" }
      ],
      x: canvas.width / 2,
      y: canvas.height / 1.35,
      alpha: 1.0,
      startTime: Date.now(),
      duration: 2000
      });

        boss = null;
        score += 20;
        nextBossScore += bossScoreStep; // Chuẩn bị cho lần xuất hiện boss tiếp theo

        // Ngừng bắn đạn boss
        clearInterval(bossShootInterval);
        bossDeathSound.currentTime = 0;
        bossDeathSound.play(); 
        updateZombieSpawnRate(); // 👈 Boss đã chết → trở lại spawn nhanh
      }
      break; // Một viên đạn chỉ trúng 1 lần
    }
  }
}

function handleGrenadeExplosions() {
  const now = Date.now();
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    if (now - g.spawnTime >= g.timer) {
      // Phát nổ

      // Xử lý zombie trúng nổ
      for (let j = zombies.length - 1; j >= 0; j--) {
        const z = zombies[j];
        const dist = Math.hypot(z.x - g.x, z.y - g.y);
        if (dist < 150) {
          const damage = 30;
          z.hp -= damage;

          damages.push({
            x: z.x,
            y: z.y,
            amount: damage,
            startTime: Date.now()
          });

          if (z.hp <= 0) {
            zombies.splice(j, 1);
            score++;
            hitSound.currentTime = 0;
            hitSound.play();
          }
        }
      }

      // Xử lý boss trúng nổ
      if (boss) {
        const distBoss = Math.hypot(boss.x - g.x, boss.y - g.y);
        if (distBoss < 150) {
          const damage = 30;
          boss.hp -= damage;

          damages.push({
            x: boss.x,
            y: boss.y,
            amount: damage,
            startTime: Date.now()
          });

          if (boss.hp <= 0) {
            spawnHealthPack(boss.x, boss.y);  // ✅ spawn bình máu
            weaponStats["Grenade"].ammo++; // ✅ tăng 1 ô chứa lựu
            notifications.push({
            lines: [
              { text: "+1 ô chứa Grenade", color: "orange" }
            ],
            x: canvas.width / 2,
            y: canvas.height / 1.35,
            alpha: 1.0,
            startTime: Date.now(),
            duration: 2000
            });

            boss = null;
            clearInterval(bossShootInterval);
            score += 15; // thưởng điểm khi hạ boss, bạn chỉnh tùy ý
            updateZombieSpawnRate(); // ✅ THÊM DÒNG NÀY
            hitSound.currentTime = 0;
            hitSound.play();
            bossDeathSound.currentTime = 0; // Reset sound to beginning
            bossDeathSound.play();
          }
        }
      }
      explosionSound.currentTime = 0;
      explosionSound.play();
      explosions.push({
        x: g.x,
        y: g.y,
        radius: 0,
        maxRadius: 149,
        alpha: 1.0,
        createdAt: now
      });
      grenades.splice(i, 1);
    }
  }
}

function bossShoot() {
  if (!boss || !player) return;
  const numBullets = bossCount;

  // Tính góc bắn từ boss đến player
  const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);
  const spread = Math.PI / 12;
  const startAngle = angleToPlayer - (spread * (numBullets - 1) / 2);

  // Tính tốc độ đạn dựa trên số lượng đạn
  const baseSpeed = 5;
  const minSpeed = 2.5;
  const speed = Math.max(minSpeed, baseSpeed - (numBullets - 1) * 0.6); // 👈 Giảm tốc độ theo số đạn

    // Tạo các viên đạn boss
  for (let i = 0; i < numBullets; i++) {
    const angle = startAngle + i * spread;
    const bullet = {
      x: boss.x,
      y: boss.y,
      speed: speed,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      radius: 5,
      damage: 10 // ➕ thêm dòng này
    };
    bossBullets.push(bullet);
  }
}

// Tương tác với đạn của boss
function updateBossBullets() {
  bossBullets.forEach((bullet, index) => {
    // Cập nhật vị trí đạn
    bullet.x += bullet.dx * bullet.speed;
    bullet.y += bullet.dy * bullet.speed;

    const dist = Math.hypot(player.x - bullet.x, player.y - bullet.y);
    const shieldRadius = isShieldActive ? player.radius + 20 : player.radius;

    if (dist < shieldRadius + bullet.radius) {
      if (isShieldActive && !bullet.reflected && dist >= shieldRadius - bullet.radius) {
        // ✅ Phản xạ vật lý nếu đạn chạm mép ngoài của khiên

        const normalX = (bullet.x - player.x) / dist;
        const normalY = (bullet.y - player.y) / dist;
        const dot = bullet.dx * normalX + bullet.dy * normalY;

        bullet.dx = bullet.dx - 2 * dot * normalX;
        bullet.dy = bullet.dy - 2 * dot * normalY;

        // Đẩy đạn ra khỏi vùng khiên để không bị lặp phản
        bullet.x = player.x + normalX * (shieldRadius + bullet.radius + 1);
        bullet.y = player.y + normalY * (shieldRadius + bullet.radius + 1);

        bullet.reflected = true;

      // ➕ Chuyển đạn vào mảng bullets
      bullets.push({
      x: bullet.x,
      y: bullet.y,
      dx: bullet.dx * bullet.speed,
      dy: bullet.dy * bullet.speed,
      radius: bullet.radius,
      speed: bullet.speed,
      damage: bullet.damage,
      color: "#0066FF", // hoặc "cyan" cho dễ nhìn
      type: "boss_reflected"
    });

      // ➖ Xoá khỏi bossBullets
      bossBullets.splice(index, 1);

      } else if (!isShieldActive) {
        player.hp -= 10;
        bossBullets.splice(index, 1);
      }
    }
    // Xoá đạn nếu ra ngoài màn hình
    if (
      bullet.x < 0 || bullet.x > canvas.width ||
      bullet.y < 0 || bullet.y > canvas.height
    ) {
      bossBullets.splice(index, 1);
    }
  });
}


// Vẽ đạn của boss
function drawBossBullets() {
    bossBullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    });
}


// ====================== CHIÊU THỨC ======================= 
function startDash() {
    const now = Date.now();
    // Chỉ cho phép dash nếu không đang dash và hồi chiêu đã qua
    if (!isDashing && (now - lastDashTime >= dashCooldown)) {
        isDashing = true;
        lastDashTime = now;
        // Tăng tốc độ người chơi
        player.speed *= dashSpeedMultiplier;

        if (dashSound.paused) { 
          dashSound.currentTime = 0;
          dashSound.play();
        }
        // Đặt timeout để kết thúc dash sau dashDuration
        setTimeout(() => {
            isDashing = false;
            player.speed /= dashSpeedMultiplier; // Trả lại tốc độ ban đầu
        }, dashDuration);
    }
}

function updateDash() {
    if (isDashing) {
        // Tạo hạt khói phía sau người chơi (hướng ngược lại với hướng di chuyển)
        // Đây là cách đơn giản, nếu muốn chính xác hơn, bạn cần biết hướng player đang di chuyển
        // Hiện tại, chúng ta tạo ngẫu nhiên xung quanh player.
        for (let i = 0; i < PARTICLE_COUNT_PER_FRAME; i++) { // Sử dụng biến mới
            const angle = Math.random() * Math.PI * 2; // Góc ngẫu nhiên
            const offsetRadius = player.radius * 0.8; // Offset để khói không trùng player
            particles.push({
                x: player.x - Math.cos(angle) * offsetRadius,
                y: player.y - Math.sin(angle) * offsetRadius,
                radius: Math.random() * (PARTICLE_RADIUS_MAX - PARTICLE_RADIUS_MIN) + PARTICLE_RADIUS_MIN, // Kích thước hạt khói ngẫu nhiên
                color: "rgba(153, 153, 153, 0.76)", // Màu khói (xám mờ)
                // Di chuyển hạt khói nhẹ nhàng, có thể điều chỉnh tốc độ này để khói 'bay' xa hơn
                dx: (Math.random() - 0.5) * PARTICLE_SPEED_MULTIPLIER,
                dy: (Math.random() - 0.5) * PARTICLE_SPEED_MULTIPLIER,
                alpha: 1, // Độ trong suốt ban đầu
                decay: PARTICLE_DECAY_RATE, // Tốc độ mờ dần
                shrink: PARTICLE_SHRINK_RATE // Tốc độ nhỏ dần
            });
        }
    }

    // Cập nhật và xóa các hạt khói
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= p.decay;
        p.radius -= p.shrink; // Sử dụng biến mới

        if (p.alpha <= 0 || p.radius <= 0) {
            particles.splice(i, 1);
        }
    }
}

// ====================== KHIÊN BẢO VỆ =======================
const shieldBoxes = [];
let lastShieldUpdateNote = ""; // nhật ký thay đổi mới nhất


function activateShield() {
  if (!isShieldActive && Date.now() - lastShieldTime >= shieldCooldown) {
    isShieldActive = true;
    shieldActivatedTime = Date.now();

    // 🔊 Âm thanh bật khiên
    shieldActivateSound.currentTime = 0;
    shieldActivateSound.play();
    // 🔥 Xoá toàn bộ đạn boss gần player (trong bán kính 120px)
    const shieldRadius = player.radius + 120;
    for (let i = bossBullets.length - 1; i >= 0; i--) {
      const b = bossBullets[i];
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < shieldRadius) {
        bossBullets.splice(i, 1);
      }
    }

    // ⏳ Khiên tự tắt sau vài giây → bắt đầu hồi chiêu tại đây
    setTimeout(() => {
      isShieldActive = false;
      lastShieldTime = Date.now(); // 💡 Hồi chiêu bắt đầu khi khiên tắt
    }, shieldDuration);
  }
}

function drawShield() {
  if (!isShieldActive) return;

  const gradient = ctx.createRadialGradient(
    player.x,
    player.y,
    player.radius,
    player.x,
    player.y,
    player.radius + 20
  );
  gradient.addColorStop(0, "rgba(0, 255, 255, 0.15)");
  gradient.addColorStop(0.6, "rgba(0, 200, 255, 0.25)");
  gradient.addColorStop(1, "rgba(0, 160, 255, 0.6)");

  // Vòng glow ngoài
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + 20, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Viền ngoài sáng trắng mờ
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + 20, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Viền trong năng lượng
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + 14, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // 👉 Vẽ thanh thời lượng lá chắn bên dưới
  const now = Date.now();
  const elapsed = now - shieldActivatedTime;
  const remaining = Math.max(0, shieldDuration - elapsed);
  const percent = remaining / shieldDuration;

  const barWidth = 60;
  const barHeight = 6;
  const barX = player.x - barWidth / 2;
  const barY = player.y + player.radius + 26; // dưới khiên một chút

  // Nền thanh
  ctx.fillStyle = "rgba(100,100,100,0.6)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Phần còn lại
  ctx.fillStyle = "rgba(0,255,255,0.9)";
  ctx.fillRect(barX, barY, barWidth * percent, barHeight);

  // Viền trắng
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}


function drawShieldCooldownBar() {
    const now = Date.now();
    const elapsed = now - lastShieldTime;
    let cooldownProgress = elapsed / shieldCooldown;
    if (cooldownProgress > 1) cooldownProgress = 1;

    const barWidth = 150;
    const barHeight = 15;
    const barX = canvas.width - barWidth - 20;
    const barY = 45;

    ctx.fillStyle = "gray";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = cooldownProgress === 1 ? "#FF3366" : "#0000FF";
    ctx.fillRect(barX, barY, barWidth * cooldownProgress, barHeight);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SHIELD", barX + barWidth / 2, barY + barHeight - 2);
}

function updateShieldPanel() {
  const panel = document.getElementById("shield-status-panel");

  // Luôn lấy giá trị thực tế mới nhất
  const currentDuration = (shieldDuration / 1000).toFixed(1) + " giây";
  const currentCooldown = (shieldCooldown / 1000).toFixed(1) + " giây";

  // Ghi nhớ thay đổi gần nhất
  const recentUpdate = lastShieldUpdateNote || "Không có cập nhật gần đây.";

  panel.innerHTML =
    `<strong style="color: #FFD700">------ Trạng thái hiện tại ------</strong><br>` +
    `+) Thời gian sử dụng Shield: ${currentDuration}<br>` +
    `+) Thời gian hồi Shield: ${currentCooldown}<br><br>` +
    `<strong style="color: #FFD700">---------- Vừa cập nhật ---------</strong><br>` +
    recentUpdate;
}


function drawShieldBoxes() {
  for (let box of shieldBoxes) {
    ctx.beginPath();
    ctx.arc(box.x, box.y, box.radius, 0, Math.PI * 2);
    ctx.fillStyle = box.color;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("S+", box.x, box.y + 3);
  }
}

function handleShieldBoxCollision() {
  for (let i = shieldBoxes.length - 1; i >= 0; i--) {
    const box = shieldBoxes[i];
    const dist = Math.hypot(player.x - box.x, player.y - box.y);

  if (dist < player.radius + box.radius) {
  const oldCooldown = Number(shieldCooldown);
  const oldDuration = Number(shieldDuration);

  // Giới hạn cooldown không nhỏ hơn 2.5s (2500ms), và thời gian sử dụng không vượt quá 8s (8000ms)
  shieldCooldown = Math.max(2500, oldCooldown - 200); // giảm 0.2s nhưng không thấp hơn 2.5s
  shieldDuration = Math.min(8000, oldDuration + 100); // tăng 0.1s nhưng không vượt quá 8.0s

  const cdChange = ((shieldCooldown - oldCooldown) / 1000).toFixed(1);
  const durChange = ((shieldDuration - oldDuration) / 1000).toFixed(1);

  // Nếu vì lý do nào đó cdChange hoặc durChange là NaN → bỏ qua cập nhật
  if (isNaN(cdChange) || isNaN(durChange)) return;

  lastShieldUpdateNote =
    `<span style="color:deepskyblue;">🛡️ Shield Time:</span> ` +
    `<span style="color:${durChange > 0 ? 'lime' : 'red'};">${durChange > 0 ? "+ " : "- "}${Math.abs(durChange)}s</span> ` +
    `(${(oldDuration / 1000).toFixed(1)} → ${(shieldDuration / 1000).toFixed(1)})<br>` +

    `<span style="color:orange;">⏱️ Cooldown:</span> ` +
    `<span style="color:${cdChange > 0 ? 'lime' : 'red'};">${cdChange > 0 ? "+ " : "- "}${Math.abs(cdChange)}s</span> ` +
    `(${(oldCooldown / 1000).toFixed(1)} → ${(shieldCooldown / 1000).toFixed(1)})`;

    // 🔊 Phát âm thanh búa đập
  shieldBoostSound.currentTime = 0;
  shieldBoostSound.play();
  reloadSound.play();
  
  const durDisplay = `${durChange > 0 ? "+" : "-"}${Math.abs(durChange)}s shield time`;
  const cdDisplay = `${cdChange > 0 ? "+" : "-"}${Math.abs(cdChange)}s cooldown`;

  notifications.push({
  lines: [
    { text: "BOOST SHIELD", color: "white" },
    { text: `${durChange > 0 ? "+" : "-"}${Math.abs(durChange)}s shield time`, color: "lime" },
    { text: `${cdChange > 0 ? "+" : "-"}${Math.abs(cdChange)}s cooldown`, color: "red" }
  ],
  x: canvas.width / 2,
  y: canvas.height / 1.35,
  alpha: 1.0,
  startTime: Date.now(),
  duration: 2000
});


  shieldBoxes.splice(i, 1);
  }


  }
}

function spawnShieldBox(x, y) {
  shieldBoxes.push({
    x,
    y,
    radius: 10,
    color: "mediumorchid", // hoặc "limegreen" tùy bạn
    spawnTime: Date.now()
  });
}



function drawParticles() {
    for (let p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 120, 0, ${p.alpha})`;
        ctx.fill();
    }
}

function drawSpeedBar() {
    const now = Date.now();
    const elapsed = now - lastDashTime;
    let cooldownProgress = elapsed / dashCooldown; // Tỷ lệ đã hồi chiêu (0 đến 1)

    // Đảm bảo progress không vượt quá 1 (đã hồi chiêu hoàn toàn)
    if (cooldownProgress > 1) {
        cooldownProgress = 1;
    }

    const barWidth = 150; // Chiều rộng của thanh Speed Bar
    const barHeight = 15; // Chiều cao của thanh Speed Bar
    const barX = canvas.width - barWidth - 20; // Vị trí X (cách cạnh phải 20px)
    const barY = 20; // Vị trí Y (cách cạnh dưới 20px)

    // Vẽ nền thanh Speed Bar
    ctx.fillStyle = "gray";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Xác định màu của thanh progress
    let progressBarColor = "deepskyblue"; // Mặc định là xanh da trời
    if (cooldownProgress === 1) { // Nếu đã hồi chiêu hoàn toàn
        progressBarColor = "#c619f5"; // Chuyển sang màu tím
    }

    // Vẽ phần đã hồi chiêu với màu đã chọn
    ctx.fillStyle = progressBarColor;
    ctx.fillRect(barX, barY, barWidth * cooldownProgress, barHeight);

    // Vẽ viền thanh Speed Bar
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Hiển thị chữ "SPEED"
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SPEED", barX + barWidth / 2, barY + barHeight - 2);
    ctx.textAlign = "left"; // Reset lại alignment để không ảnh hưởng các text khác
}

function drawNotifications() {
  const now = Date.now();
  for (let i = notifications.length - 1; i >= 0; i--) {
    const notif = notifications[i];
    const elapsed = now - notif.startTime;

    if (elapsed > notif.duration) {
      notifications.splice(i, 1);
      continue;
    }

    const alpha = 1 - (elapsed / notif.duration);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lineHeight = 28;
    const lines = notif.lines || [{ text: notif.text, color: "white" }];
    const totalHeight = lineHeight * lines.length;
    const startY = notif.y - totalHeight / 2;

    lines.forEach((line, j) => {
      ctx.fillStyle = line.color || "white";
      ctx.fillText(line.text, notif.x, startY + j * lineHeight);
    });

    ctx.restore();
  }
}




document.addEventListener("contextmenu", function(e) {
  e.preventDefault();
});

// Hàm gọi tất cả mọi thứ
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  movePlayer();
  moveZombies();
  moveBullets();
  moveGrenades();
  drawExplosions();
  drawDamages(); 
  handleGrenadeExplosions();
  drawGrenades();
  handleBulletZombieCollision();
  drawPlayer();
  drawShield();
  drawHPBar();
  drawScore();
  drawGun();
  handleWeaponBoxCollision();
  handleAmmoBoxCollision();
  handleBulletBossCollision();
  updateBossBullets();
  drawBossBullets();
  if (score >= nextBossScore && !boss) {
  spawnBoss();
  nextBossScore += bossScoreStep;
}
moveBoss();
drawBoss();
drawBossHPBar();
updateDash();
drawParticles(); // Vẽ các hạt khói
updateShieldPanel();
drawShieldBoxes();
handleShieldBoxCollision();
drawHealthPacks();
handleHealthPackCollision();
// Xoá bình máu sau 60 giây
for (let i = healthPacks.length - 1; i >= 0; i--) {
  if (Date.now() - healthPacks[i].spawnTime > 60000) {
    healthPacks.splice(i, 1);
  }
}


for (let i = shieldBoxes.length - 1; i >= 0; i--) {
  if (Date.now() - shieldBoxes[i].spawnTime > 7000) {
    shieldBoxes.splice(i, 1);
  }
}


// ➕ Xóa hộp súng sau 8 giây
const now = Date.now();
for (let i = weaponBoxes.length - 1; i >= 0; i--) {
  if (now - weaponBoxes[i].spawnTime > 8000) {
    weaponBoxes.splice(i, 1);
  }
}
for (let i = ammoBoxes.length - 1; i >= 0; i--) {
  if (now - ammoBoxes[i].spawnTime > 8000) {
    ammoBoxes.splice(i, 1);
  }
}
  drawWeaponBoxes();
  drawAmmoBoxes();
for (let z of zombies) drawCircle(z);
//   for (let b of bullets) drawCircle(b);
for (let b of bullets) {
  if (b.type === "laser") {
    const angle = Math.atan2(b.dy, b.dx);
    const length = 35;
    const width = 3;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    ctx.fillStyle = b.color;
    ctx.fillRect(0, -width / 2, length, width);
    ctx.restore();

  } else if (b.type === "plasma") {
  const segments = 6; // Số đoạn gấp khúc
  const angle = Math.atan2(b.dy, b.dx);
  const length = 30; // Độ dài tổng thể của tia
  const segmentLength = length / segments;

  let x = b.x - Math.cos(angle) * length; // điểm đầu (đuôi)
  let y = b.y - Math.sin(angle) * length;

  ctx.strokeStyle = "rgba(255, 251, 0, 0.95)"; // Màu điện xanh
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);

  // Vẽ các đoạn zig-zag
  for (let i = 1; i <= segments; i++) {
    const offset = (Math.random() - 0.5) * 8; // Độ lệch ngang
    x += Math.cos(angle) * segmentLength;
    y += Math.sin(angle) * segmentLength;

    const perpAngle = angle + Math.PI / 2; // góc vuông
    const px = x + Math.cos(perpAngle) * offset;
    const py = y + Math.sin(perpAngle) * offset;

    ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Thêm quầng sáng nhỏ ở đầu đạn (như đầu tia sét)
  const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 8);
  glow.addColorStop(0, "rgba(0, 255, 255, 0.94)");
  glow.addColorStop(1, "rgba(0, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
  ctx.fill();
}
 else if (b.type === "plasma_big") {
    const width = 38;
    const height = 14;

    // Plasma lớn – glowing explosion ball
    const glowGradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 4);
    glowGradient.addColorStop(0, "rgb(0, 183, 255)");
    glowGradient.addColorStop(0.5, "rgba(0, 132, 255, 0.5)");
    glowGradient.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = glowGradient;
    ctx.save();
    ctx.translate(b.x, b.y);
    const angle = Math.atan2(b.dy, b.dx);
    ctx.rotate(angle);

    ctx.beginPath();
    const radius = 6;
    ctx.moveTo(-width/2 + radius, -height/2);
    ctx.lineTo(width/2 - radius, -height/2);
    ctx.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + radius);
    ctx.lineTo(width/2, height/2 - radius);
    ctx.quadraticCurveTo(width/2, height/2, width/2 - radius, height/2);
    ctx.lineTo(-width/2 + radius, height/2);
    ctx.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - radius);
    ctx.lineTo(-width/2, -height/2 + radius);
    ctx.quadraticCurveTo(-width/2, -height/2, -width/2 + radius, -height/2);
    ctx.closePath();
    ctx.fillStyle = "#30c6f0";
    ctx.fill();
    ctx.restore();

    // Viền nhấp nháy trắng
    ctx.strokeStyle = "rgba(25, 86, 219, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 2, 0, Math.PI * 2);
    ctx.stroke();

    // 🌟 Hiệu ứng hào quang năng lượng tỏa ra
    const halo = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 4.5);
    halo.addColorStop(0, "rgba(0, 255, 255, 0.25)");
    halo.addColorStop(0.4, "rgba(0, 160, 255, 0.15)");
    halo.addColorStop(0.8, "rgba(0, 100, 255, 0.05)");
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 4.5, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 120);
    ctx.globalAlpha = pulse * 0.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * (3.5 + pulse), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 200, 255, 0.1)";
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 👇 Trail (vệt sáng đuôi)
    for (let t = 0; t < 6; t++) {
      const trailX = b.x - b.dx * t * 1.8;
      const trailY = b.y - b.dy * t * 1.8;
      const alpha = 0.2 - t * 0.03;
      ctx.beginPath();
      ctx.arc(trailX, trailY, 6 - t, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
      ctx.fill();
    }
  }else {
    // ✅ Vẽ các loại đạn mặc định còn lại như Pistol, Shotgun, Machine Gun
    drawCircle(b);
  }
}

// Bắn liên thanh khi giữ chuột và dùng Machine Gun
if (currentWeapon === "Machine Gun" && isMouseDown && player.hp > 0 && ammo["Machine Gun"] > 0 && !justFiredBigPlasma) {
  const muzzle = getMuzzleWorldPosition();
  const now = Date.now();
  if (now - lastMachineGunShot > machineGunFireRate) {
    const angle = Math.atan2(lastMouse.y - player.y, lastMouse.x - player.x);
    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      radius: 4,
      speed: 7,
      dx: Math.cos(angle) * 7,
      dy: Math.sin(angle) * 7,        
      color: "red",
      damage: weaponStats["Machine Gun"].damage,
      type: "machinegun"
    });
    ammo["Machine Gun"]--;
    lastMachineGunShot = now;
    machineGunSound.currentTime = 0;
    machineGunSound.play();

    // Kích hoạt hiệu ứng giật và chớp vàng cho Machine Gun
    gunRecoil = WEAPON_RECOIL_AMOUNT[currentWeapon];
    lastGunFireTime = Date.now();
  }
}
if (justFiredBigPlasma) {
    justFiredBigPlasma = false;
}

let gameOver = false;
let gameOverTime = 0;
if (player.hp <= 0) {
  ctx.fillStyle = "white";
  ctx.font = "58px bold sans-serif";
  ctx.fillText("Game Over", 300, 300);
  ctx.textAlign = "left"; // 👈 reset lại để tránh ảnh hưởng đến Score/Bullet/Grenade

  if (!gameOver) {
    gameOver = true;
    gameOverTime = Date.now();

    // 🔊 Phát nhạc kết thúc sau 2 giây
    setTimeout(() => {
      endingMusic.currentTime = 0;
      endingMusic.play();
    }, 5000);
  }
  return;
}

// Cập nhật trạng thái giật của súng
if (gunRecoil > 0) {
  gunRecoil -= RECOIL_SPEED; // Giảm độ giật dần
  if (gunRecoil < 0) gunRecoil = 0; // Đảm bảo không giật quá đà
}
drawSpeedBar(); 
drawShieldCooldownBar(); // ➕ Hiển thị thanh hồi chiêu SHIELD bên dưới SPEED
drawDebugInfo(); // thêm dòng này
drawNotifications();

// Vẽ thanh tích tụ năng lượng Plasma Rifle
if (currentWeapon === "Plasma Rifle") {
    const barWidth = 200;
    const barHeight = 15;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = canvas.height - 50; // Vị trí thanh bar

    // Vẽ nền thanh bar
    ctx.fillStyle = "darkgray";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Vẽ phần tích tụ
    let chargeFillColor = "rgba(0, 255, 0, 0.8)"; // Mặc định xanh lá
    if (plasmaChargeAmount >= MAX_PLASMA_CHARGE) {
      chargeFillColor = "rgba(132, 6, 190, 0.95)"; // Cam khi đầy 100%
    }

    ctx.fillStyle = chargeFillColor;
    ctx.fillRect(barX, barY, barWidth * (plasmaChargeAmount / MAX_PLASMA_CHARGE), barHeight);

    // Vẽ viền thanh bar
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PLASMA CHARGE", barX + barWidth / 2, barY - 5);
    ctx.textAlign = "left";
}

// Xử lý tích tụ năng lượng Plasma Rifle
if (currentWeapon === "Plasma Rifle") {
    if (isChargingPlasma) { // Khi đang giữ chuột trái để sạc
        plasmaChargeAmount += CHARGE_RATE;
        // Chỉ giới hạn ở mức tối đa, không có quá tải
        if (plasmaChargeAmount >= MAX_PLASMA_CHARGE) { // Dòng này chỉ giới hạn, không có logic quá tải
            plasmaChargeAmount = MAX_PLASMA_CHARGE;

          if (!plasmaFullyChargedPlayed) {
            plasmaDingSound.currentTime = 0;
            plasmaDingSound.play();
            plasmaFullyChargedPlayed = true;
          }
          // 🔇 Tắt âm thanh sạc nếu đã đầy
            plasmaChargeSound.pause();
            plasmaChargeSound.currentTime = 0;
            plasmaChargeStarted = false;
        }
    } else if (plasmaChargeAmount > 0) { // Giảm năng lượng khi không tích tụ (sau khi nhả chuột)
        plasmaChargeAmount -= DRAIN_RATE;
        if (plasmaChargeAmount < 0) {
            plasmaChargeAmount = 0;
        }
    }
} else { // Reset nếu đổi súng không phải Plasma Rifle
    plasmaChargeAmount = 0;
    isChargingPlasma = false;
    // overchargeTime = 0; // Dòng này đã được xóa/comment nếu bạn đã xóa biến overchargeTime
}

// Phát âm plasma_charge nếu giữ chuột đủ lâu
if (isChargingPlasma && !plasmaChargeStarted) {
    const holdTime = Date.now() - plasmaChargeStartTime;
    if (holdTime >= 100) { // 100ms: giữ chuột ngắn thì không nghe
        plasmaChargeSound.currentTime = 0;
        plasmaChargeSound.loop = true;
        plasmaChargeSound.play();
        plasmaChargeStarted = true;
    }
}



requestAnimationFrame(update);
}
update();
updateZombieSpawnRate();

