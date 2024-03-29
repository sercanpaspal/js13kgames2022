const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let player
const FPS = 60;
const INPUTS = {};
let NODES = [];
let MOUSE = { x: 0, y: 0 }
window.addEventListener('keydown', e => INPUTS[e.key] = true);
window.addEventListener('keyup', e => INPUTS[e.key] = false);
window.addEventListener('mousedown', () => INPUTS["MouseDown"] = true);
window.addEventListener('mouseup', () => INPUTS["MouseDown"] = false);
canvas.addEventListener('mousemove', e => MOUSE = { x: e.clientX, y: e.clientY });

const isUp = () => INPUTS['w'] || INPUTS['W'] || INPUTS['ArrowUp'];
const isDown = () => INPUTS['s'] || INPUTS['S'] || INPUTS['ArrowDown'];
const isLeft = () => INPUTS['a'] || INPUTS['A'] || INPUTS['ArrowLeft'];
const isRight = () => INPUTS['d'] || INPUTS['D'] || INPUTS['ArrowRight'];

function drawRoom(room) {
  const { walls, door, startPoint, nodes } = room;
  const mappedWalls = walls.map((point, i) => {
    const nextPointIndex = i + 1 === walls.length ? 0 : i + 1;
    const nextPoint = walls[nextPointIndex];
    let w = nextPoint[0] - point[0];
    let h = nextPoint[1] - point[1];
    let x = point[0];
    let y = point[1];
    if (w < 0) {
      w = Math.abs(w);
      x -= w;
    }
    if (h < 0) {
      h = Math.abs(h);
      y -= h;
    }
    w += w !== 0 ? 5 : 0;
    return new Wall(x, y, w || 5, h || 5)
  });

  player.pos.x = startPoint[0];
  player.pos.y = startPoint[1];

  NODES = [player, ...mappedWalls, new Door(...door), ...nodes.map(n => n())];
}

function isColl(n1, n2){
  const l1 = n1.pos.x;
  const t1 = n1.pos.y;
  const r1 = l1 + n1.w;
  const b1 = t1 + n1.h;

  const l2 = n2.pos.x;
  const t2 = n2.pos.y;
  const r2 = l2 + n2.w;
  const b2 = t2 + n2.h;

  return !(b1 < t2 || t1 > b2 || r1 < l2 || l1 > r2);
}

function getDistance(pos1, pos2){
  let y = pos2.x - pos1.x;
  let x = pos2.y - pos1.y;

  return Math.abs(Math.sqrt(x * x + y * y));
}

function getAngle(pos1, pos2) {
  return Math.atan2(pos1.y - pos2.y, pos1.x - pos2.x) / Math.PI * 180
}

function createRect(x, y, w, h) {
  ctx.beginPath();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = "1";
  ctx.rect(x, y, w, h);
  ctx.stroke();
}

const calculateCollision = node => {
  for(let i = 0;i < NODES.length;i++){
    let otherNode = NODES[i];
    if(node!==otherNode && otherNode.collidable){
      isColl(node, otherNode) ? node.onCollision(otherNode) : node.onCollisionExit(otherNode);
    }
  }
}

const getMousePos = () => ({
  x: MOUSE.x - window.innerWidth / 2,
  y: MOUSE.y - window.innerHeight / 2
})

class Node {
  constructor(x, y, w, h) {
    this.pos = {
      x,
      y
    };
    this.w = w;
    this.h = h;
    this.speed = 1;
    this.collidable = true;
  }
  getCenterPos() {
    return {
      x: this.pos.x + (this.w / 2),
      y: this.pos.y + (this.h / 2)
    }
  }
  getPos() {
    return {
      x: this.pos.x + player.getCanvasPos().x,
      y: this.pos.y + player.getCanvasPos().y
    }
  }
  onCollision() {}
  onCollisionExit() {}
  update() {
    this.beforePosition = {...this.pos};
  }
  render() {}
  destroy() {
    NODES = NODES.filter(n => n !== this);
  }
}

class Wall extends Node {
  render(){
    ctx.fillStyle = "#000000";
    ctx.fillRect(this.getPos().x, this.getPos().y, this.w, this.h);
  }
}

class Door extends Wall {
  render() {
    ctx.fillStyle = "#00FF00";
    createRect(this.getPos().x, this.getPos().y, this.w, this.h);
    ctx.fillRect(this.getPos().x, this.getPos().y, this.w, this.h);
  }
}

class Body extends Node {
  constructor(...props) {
    super(...props);
    this.health = 100;
  }

  onCollision(node) {
    if (node instanceof Wall || node instanceof Body){
      const x = this.pos.x;
      this.pos.x = this.beforePosition.x;
      if (isColl(this, node)) {
        this.pos.y = this.beforePosition.y;
        this.pos.x = x;
      }
    }
  }

  update() {
    super.update();
    if (this.health <= 0) {
      this.destroy();
      NODES.push(new Monster(0, 0));
    }
  }

  render() {
    const w = 32, h = 4, y = this.getPos().y - (h * 2), x = this.getPos().x - (w / 2) + (this.w / 2);
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(x, y, w * this.health / 100, h);
    createRect(x, y, w, h);
  }
}

class Monster extends Body {
  constructor(x, y) {
    super(x, y, 20, 20);
  }

  update() {
    super.update();
    const angle = getAngle(player.getCenterPos(), this.getCenterPos());
    const distance = getDistance(player.getCenterPos(), this.getCenterPos());

    if (distance > 200) return;

    let direction = 0;
    if (distance < 35) {
      direction = player.speed * -1;
    } else if (distance > 40) {
      direction = 1
    }

    this.pos.x += Math.cos(angle/180*Math.PI) * this.speed * direction;
    this.pos.y += Math.sin(angle/180*Math.PI) * this.speed * direction;
  }

  render() {
    super.render();
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(this.getPos().x, this.getPos().y, this.w, this.h);
    createRect(this.getPos().x, this.getPos().y, this.w, this.h);
  }
}

class Magic extends Node {
  constructor() {
    super();
    this.w = 1;
    this.h = 1;
    this.speed = 6;
    this.isGuide = true;
  }

  update() {
    super.update();

    this.cos = Math.cos(this.angle/180*Math.PI);
    this.sin = Math.sin(this.angle/180*Math.PI);

    if (this.isGuide) {
      this.angle = getAngle({ x: 0, y: 0 }, getMousePos());
      this.pos.x = player.pos.x + player.w / 2;
      this.pos.y = player.pos.y + player.h / 2;
    } else {
      this.pos.x += this.cos * -this.speed;
      this.pos.y += this.sin * -this.speed;
    }

    if (INPUTS['MouseDown']) {
      this.isGuide = false;
    }
  }

  render() {
    if (this.isGuide) {
      ctx.beginPath();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = "3";
      ctx.moveTo(this.getPos().x, this.getPos().y);
      ctx.lineTo(this.cos * -100 + this.getPos().x, this.sin * -100 + this.getPos().y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = "3";
      ctx.moveTo(this.getPos().x, this.getPos().y);
      ctx.lineTo(this.cos * 20 + this.getPos().x, this.sin * 20 + this.getPos().y);
      ctx.stroke();
    }
  }

  onCollision(node) {
    if (!this.isGuide && (node instanceof Monster || node instanceof Wall)) {
      node.health -= 50;
      this.destroy();
    }
  }
}

class Player extends Body {
  constructor() {
    super(0, 0, 10, 20);
    this.speed = 3;
    this.jump = false;
    this.q = false;
  }

  update(){
    super.update();
    let speed = ((isUp() || isDown()) && (isLeft() || isRight()) ? Math.cos(45/180*Math.PI) : 1) * this.speed;
    if (isUp()) this.pos.y -= speed;
    if (isDown()) this.pos.y += speed;
    if (isLeft()) this.pos.x -= speed;
    if (isRight()) this.pos.x += speed;

    if (INPUTS[' '] && !this.jump) {
      this.jump = true;
      const currentSpeed = this.speed;
      this.speed = 10;
      setTimeout(() => this.jump = false, 2000);
      setTimeout(() => this.speed = currentSpeed, 200);
    }

    if (INPUTS['q'] && !this.q) {
      this.q = true;
      setTimeout(() => this.q = false, 1000);
      NODES.push(new Magic());
    }
  }

  getPos() {
    return {
      x: (canvas.offsetWidth / 2) - (this.w / 2),
      y: (canvas.offsetHeight / 2) - (this.h / 2)
    }
  }

  getCanvasPos() {
    return {
      x: (canvas.offsetWidth / 2) - this.pos.x - this.w / 2,
      y: (canvas.offsetHeight / 2) - this.pos.y - this.h / 2
    }
  }

  render(){
    super.render()
    createRect(this.getPos().x, this.getPos().y, this.w, this.h);
  }

  onCollision(node) {
    super.onCollision(node);

    if (node instanceof Door) {
      drawRoom(SampleRoom)
    }
  }
}

class Text extends Node {
  constructor(text, x, y, fontSize = '32px') {
    super(x, y);
    this.text = text;
    this.fontSize = fontSize;
  }

  render() {
    ctx.font = `${this.fontSize} Arial`;
    ctx.fillStyle = "#000000";
    ctx.fillText(this.text, this.getPos().x, this.getPos().y);
  }
}

const SampleRoom = {
  walls: [
    [-200, 150],
    [-200, 50],
    [-100, 50],
    [-100, -100],
    [100, -100],
    [100, 150],
  ],
  door: [-25, -105, 50, 15],
  startPoint: [-150, 95],
  nodes: [
    () => new Monster(0, -75),
    () => new Monster(0, 0),
    () => new Monster(0, 75),
    () => new Text("Press WASD to move!", -190, 200),
    () => new Text("Press Q to use skill!", -190, 240),
    () => new Text("I started to make this game for the 2023 13KB game challange.", -240, -140, '11px'),
    () => new Text("I couldn't finish it because I didn't have enough time :/", -240, -128, '11px'),
    () => new Text("I imagined a game in the rogue like genre where you can progress through rooms and improve your skills with the resources you collect.", -240, -116, '11px')
  ]
};

player = new Player();

drawRoom(SampleRoom);

const loop = () => {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  for(let i = 0;i < NODES.length;i++){
    const node = NODES[i];
    node.update();
    if(node.collidable) calculateCollision(node)
    node.render();
  }
}

setInterval(loop, 1000/FPS);
