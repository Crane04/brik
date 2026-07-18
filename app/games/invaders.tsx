import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { RetroHandheld } from "@/components/RetroHandheld";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useConsoleStore } from "@/store/useConsoleStore";

const W = 196;
const H = 350;
const PLAYER_W = 24;
const PLAYER_H = 24;

type Bullet = { id: number; x: number; y: number; vx: number; vy: number; enemy: boolean };
type Enemy = { id: number; x: number; y: number; vx: number; hp: number; maxHp: number; boss: boolean; cooldown: number };
type Particle = { id: number; x: number; y: number; vx: number; vy: number; life: number; size: number };
type Bonus = { id: number; x: number; y: number; type: "gun" | "life" };

export default function FighterScreen({ onExit }: { onExit?: () => void } = {}) {
  const router = useRouter();
  const highScore = useConsoleStore((state) => state.highScores.fighter);
  const recordScore = useConsoleStore((state) => state.recordScore);
  const [player, setPlayer] = useState({ x: W / 2 - PLAYER_W / 2, y: H - 38 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [kills, setKills] = useState(0);
  const [paused, setPaused] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [gunLevel, setGunLevel] = useState(1);
  const frame = useRef(0);
  const id = useRef(1);
  const playerRef = useRef(player);
  const bulletsRef = useRef(bullets);
  const enemiesRef = useRef(enemies);
  const particlesRef = useRef(particles);
  const bonusesRef = useRef(bonuses);
  const killsRef = useRef(kills);
  const shotCooldown = useRef(false);
  playerRef.current = player;
  bulletsRef.current = bullets;
  enemiesRef.current = enemies;
  particlesRef.current = particles;
  bonusesRef.current = bonuses;
  killsRef.current = kills;

  const level = 1 + Math.floor(kills / 8);
  const gunCount = Math.min(4, gunLevel);

  const spawnWaveEnemy = useCallback(() => {
    const bossDue = killsRef.current > 0 && killsRef.current % 10 === 0 && !enemiesRef.current.some((enemy) => enemy.boss);
    const boss = bossDue;
    const size = boss ? 44 : 24;
    const hp = boss ? 8 + level * 2 : 1 + Math.floor(level / 3);
    const enemy: Enemy = {
      id: id.current++,
      x: boss ? W / 2 - size / 2 : 8 + Math.random() * (W - size - 16),
      y: -size,
      vx: boss ? 1.1 : (Math.random() - 0.5) * 0.8,
      hp,
      maxHp: hp,
      boss,
      cooldown: 18 + Math.floor(Math.random() * 26),
    };
    const nextEnemies = [...enemiesRef.current, enemy];
    enemiesRef.current = nextEnemies;
    setEnemies(nextEnemies);
  }, [level]);

  const shoot = useCallback(() => {
    if (!started || paused || gameOver || shotCooldown.current) return;
    shotCooldown.current = true;
    setTimeout(() => { shotCooldown.current = false; }, 95);
    const p = playerRef.current;
    const spread = gunCount === 1 ? [0] : gunCount === 2 ? [-5, 5] : gunCount === 3 ? [-8, 0, 8] : [-10, -3, 3, 10];
    const shots = spread.map((offset, index): Bullet => ({
      id: id.current++,
      x: p.x + PLAYER_W / 2 + offset,
      y: p.y - 8,
      vx: gunCount >= 3 ? (index - (spread.length - 1) / 2) * 0.18 : 0,
      vy: -7,
      enemy: false,
    }));
    const nextBullets = [...bulletsRef.current, ...shots];
    bulletsRef.current = nextBullets;
    setBullets(nextBullets);
  }, [gameOver, gunCount, paused, started]);

  const move = useCallback((dx: number, dy: number) => {
    if (!started || paused || gameOver) return;
    setPlayer((current) => ({
      x: Math.max(0, Math.min(W - PLAYER_W, current.x + dx)),
      y: Math.max(H * 0.52, Math.min(H - PLAYER_H, current.y + dy)),
    }));
  }, [gameOver, paused, started]);

  const start = useCallback(() => {
    setPlayer({ x: W / 2 - PLAYER_W / 2, y: H - 38 });
    setBullets([]);
    setEnemies([]);
    setParticles([]);
    setBonuses([]);
    setScore(0);
    setKills(0);
    setLives(5);
    setGameOver(false);
    setStarted(true);
    setGunLevel(1);
    setPaused(false);
    frame.current = 0;
  }, []);

  const tick = useCallback(() => {
    frame.current += 1;
    const spawnRate = Math.max(24, 58 - level * 3);
    if (frame.current === 1 || frame.current % spawnRate === 0) spawnWaveEnemy();

    let nextBullets = bulletsRef.current
      .map((bullet) => ({ ...bullet, x: bullet.x + bullet.vx, y: bullet.y + bullet.vy }))
      .filter((bullet) => bullet.y > -12 && bullet.y < H + 12);
    let nextParticles = particlesRef.current
      .map((particle) => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        vy: particle.vy + 0.035,
        vx: particle.vx * 0.97,
        life: particle.life - 1,
      }))
      .filter((particle) => particle.life > 0);
    let nextBonuses = bonusesRef.current
      .map((bonus) => ({ ...bonus, y: bonus.y + 1.25 }))
      .filter((bonus) => bonus.y < H + 14);
    let nextEnemies = enemiesRef.current.map((enemy) => {
      const size = enemy.boss ? 44 : 24;
      let x = enemy.x + enemy.vx;
      let vx = enemy.vx;
      if (x <= 0 || x >= W - size) {
        vx *= -1;
        x = Math.max(0, Math.min(W - size, x));
      }
      const descend = enemy.boss ? 0.36 + level * 0.025 : 0.58 + level * 0.045;
      let cooldown = enemy.cooldown - 1;
      if (cooldown <= 0) {
        nextBullets.push({ id: id.current++, x: x + size / 2, y: enemy.y + size, vx: 0, vy: 3.2 + level * 0.08, enemy: true });
        cooldown = enemy.boss ? 15 : 34 + Math.floor(Math.random() * 28);
      }
      return { ...enemy, x, vx, y: Math.min(enemy.boss ? H * 0.28 : H + size, enemy.y + descend), cooldown };
    });

    const removedBullets = new Set<number>();
    const destroyed = new Set<number>();
    nextEnemies = nextEnemies.map((enemy) => {
      const size = enemy.boss ? 44 : 24;
      let hp = enemy.hp;
      for (const bullet of nextBullets) {
        if (bullet.enemy || removedBullets.has(bullet.id)) continue;
        if (bullet.x >= enemy.x && bullet.x <= enemy.x + size && bullet.y >= enemy.y && bullet.y <= enemy.y + size) {
          removedBullets.add(bullet.id);
          hp -= 1;
          for (let index = 0; index < (enemy.boss ? 7 : 4); index++) {
            nextParticles.push({
              id: id.current++, x: bullet.x, y: bullet.y,
              vx: (Math.random() - 0.5) * 3.4,
              vy: (Math.random() - 0.5) * 3.4,
              life: 10 + Math.floor(Math.random() * 9), size: index % 3 === 0 ? 3 : 2,
            });
          }
        }
      }
      if (hp <= 0) destroyed.add(enemy.id);
      return { ...enemy, hp };
    });

    if (destroyed.size) {
      for (const enemy of nextEnemies) {
        if (!destroyed.has(enemy.id)) continue;
        setScore((value) => value + (enemy.boss ? 500 : 50));
        setKills((value) => value + (enemy.boss ? 2 : 1));
        const size = enemy.boss ? 44 : 24;
        for (let index = 0; index < (enemy.boss ? 28 : 12); index++) {
          const angle = Math.random() * Math.PI * 2;
          const force = 0.7 + Math.random() * (enemy.boss ? 4.2 : 2.8);
          nextParticles.push({
            id: id.current++, x: enemy.x + size / 2, y: enemy.y + size / 2,
            vx: Math.cos(angle) * force, vy: Math.sin(angle) * force,
            life: 16 + Math.floor(Math.random() * (enemy.boss ? 20 : 12)),
            size: enemy.boss && index % 4 === 0 ? 4 : 2,
          });
        }
        if (enemy.boss || Math.random() < 0.24) {
          nextBonuses.push({
            id: id.current++,
            x: enemy.x + size / 2 - 7,
            y: enemy.y + size / 2 - 7,
            type: !enemy.boss && Math.random() < 0.2 ? "life" : "gun",
          });
        }
      }
      nextEnemies = nextEnemies.filter((enemy) => !destroyed.has(enemy.id));
    }

    const p = playerRef.current;
    let hitPlayer = false;
    for (const bullet of nextBullets) {
      if (!bullet.enemy) continue;
      if (bullet.x >= p.x && bullet.x <= p.x + PLAYER_W && bullet.y >= p.y && bullet.y <= p.y + PLAYER_H) {
        removedBullets.add(bullet.id);
        hitPlayer = true;
        for (let index = 0; index < 14; index++) {
          const angle = Math.random() * Math.PI * 2;
          const force = 0.8 + Math.random() * 3.2;
          nextParticles.push({
            id: id.current++, x: bullet.x, y: bullet.y,
            vx: Math.cos(angle) * force, vy: Math.sin(angle) * force,
            life: 14 + Math.floor(Math.random() * 14), size: index % 4 === 0 ? 4 : 2,
          });
        }
      }
    }
    nextBullets = nextBullets.filter((bullet) => !removedBullets.has(bullet.id));

    const collected = nextBonuses.filter((bonus) =>
      bonus.x + 14 >= p.x && bonus.x <= p.x + PLAYER_W &&
      bonus.y + 14 >= p.y && bonus.y <= p.y + PLAYER_H,
    );
    if (collected.length) {
      for (const bonus of collected) {
        if (bonus.type === "gun") setGunLevel((value) => Math.min(4, value + 1));
        else setLives((value) => Math.min(8, value + 1));
        for (let index = 0; index < 10; index++) {
          nextParticles.push({
            id: id.current++, x: bonus.x + 7, y: bonus.y + 7,
            vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
            life: 12 + index, size: 2,
          });
        }
      }
      const collectedIds = new Set(collected.map((bonus) => bonus.id));
      nextBonuses = nextBonuses.filter((bonus) => !collectedIds.has(bonus.id));
    }

    if (nextEnemies.some((enemy) => !enemy.boss && enemy.y > H - 12)) hitPlayer = true;
    nextEnemies = nextEnemies.filter((enemy) => enemy.boss || enemy.y <= H - 12);

    if (hitPlayer) {
      setLives((value) => {
        if (value <= 1) {
          setGameOver(true);
          setPaused(true);
          return 0;
        }
        return value - 1;
      });
    }
    bulletsRef.current = nextBullets;
    enemiesRef.current = nextEnemies;
    particlesRef.current = nextParticles;
    bonusesRef.current = nextBonuses;
    setBullets(nextBullets);
    setEnemies(nextEnemies);
    setParticles(nextParticles);
    setBonuses(nextBonuses);
  }, [level, spawnWaveEnemy]);

  useGameLoop(tick, started && !paused && !gameOver, 32);
  useEffect(() => recordScore("fighter", score), [recordScore, score]);

  return (
    <RetroHandheld
      title="FIGHT" score={score} highScore={highScore} lives={lives} level={level} speed={Math.min(9, level)}
      onBack={() => onExit ? onExit() : router.back()}
      onStartPause={() => gameOver || !started ? start() : setPaused((value) => !value)}
      onUp={() => move(0, -8)} onDown={() => move(0, 8)}
      onLeft={() => move(-8, 0)} onRight={() => move(8, 0)}
      onAction={shoot} actionLabel="SHOOT" repeatAction
    >
      <View style={styles.field}>
        {enemies.map((enemy) => <EnemySprite key={enemy.id} enemy={enemy} />)}
        {bullets.map((bullet) => (
          <View key={bullet.id} style={[styles.bullet, { left: bullet.x - 1.5, top: bullet.y, height: bullet.enemy ? 7 : 9 }, bullet.enemy && styles.enemyBullet]} />
        ))}
        {particles.map((particle) => (
          <View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                opacity: Math.min(1, particle.life / 12),
              },
            ]}
          />
        ))}
        {bonuses.map((bonus) => (
          <View key={bonus.id} style={[styles.bonus, { left: bonus.x, top: bonus.y }]}>
            <Text style={styles.bonusText}>{bonus.type === "gun" ? "G" : "+"}</Text>
          </View>
        ))}
        {started && <View style={[styles.player, { left: player.x, top: player.y }]}>
          <View style={styles.tankBody} />
          <View style={styles.tankTurret} />
          {Array.from({ length: gunCount }, (_, index) => <View key={index} style={[styles.gun, { left: 4 + index * (16 / Math.max(1, gunCount - 1)) }]} />)}
        </View>}
        {(!started || paused || gameOver) && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>{gameOver ? "GAME OVER" : paused && started ? "PAUSE" : "FIGHT"}</Text>
            <Text style={styles.overlaySub}>{gameOver ? score.toString().padStart(5, "0") : `GUN ${gunCount}`}</Text>
            <TouchableOpacity style={styles.restartBtn} onPress={start}><Text style={styles.restartText}>{gameOver ? "PLAY AGAIN" : "START"}</Text></TouchableOpacity>
          </View>
        )}
      </View>
    </RetroHandheld>
  );
}

function EnemySprite({ enemy }: { enemy: Enemy }) {
  const size = enemy.boss ? 44 : 24;
  return (
    <View style={[styles.enemy, enemy.boss && styles.boss, { left: enemy.x, top: enemy.y, width: size, height: size }]}>
      <View style={enemy.boss ? styles.bossCore : styles.enemyCore} />
      <View style={[styles.enemyGun, enemy.boss && styles.bossGunLeft]} />
      {enemy.boss && <View style={[styles.enemyGun, styles.bossGunRight]} />}
      {enemy.boss && <View style={[styles.hp, { width: Math.max(2, (size - 6) * enemy.hp / enemy.maxHp) }]} />}
    </View>
  );
}

const INK = "#253127";
const LCD = "#bcc8ab";
const styles = StyleSheet.create({
  field: { width: W, height: H, position: "relative", borderWidth: 2, borderColor: "rgba(37,49,39,0.45)", overflow: "hidden" },
  player: { position: "absolute", width: PLAYER_W, height: PLAYER_H, alignItems: "center" },
  tankBody: { position: "absolute", left: 2, right: 2, top: 7, bottom: 0, backgroundColor: INK },
  tankTurret: { position: "absolute", width: 10, height: 9, top: 2, backgroundColor: INK },
  gun: { position: "absolute", width: 3, height: 9, top: -5, backgroundColor: INK },
  enemy: { position: "absolute", alignItems: "center", justifyContent: "center" },
  enemyCore: { width: 22, height: 18, borderWidth: 2, borderColor: INK },
  boss: { borderWidth: 2, borderColor: INK },
  bossCore: { width: 30, height: 25, borderWidth: 2, borderColor: INK },
  enemyGun: { position: "absolute", width: 4, height: 8, bottom: -4, backgroundColor: INK },
  bossGunLeft: { left: 8 }, bossGunRight: { right: 8 },
  hp: { position: "absolute", left: 3, bottom: 3, height: 2, backgroundColor: INK },
  bullet: { position: "absolute", width: 3, backgroundColor: INK },
  enemyBullet: { backgroundColor: "rgba(37,49,39,0.58)" },
  particle: { position: "absolute", backgroundColor: INK },
  bonus: { position: "absolute", width: 14, height: 14, borderWidth: 2, borderColor: INK, backgroundColor: LCD, alignItems: "center", justifyContent: "center" },
  bonusText: { color: INK, fontFamily: "monospace", fontSize: 8, lineHeight: 9, fontWeight: "900" },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(188,200,171,0.86)", alignItems: "center", justifyContent: "center", gap: 10 },
  overlayText: { color: INK, fontFamily: "monospace", fontSize: 20, fontWeight: "900", letterSpacing: 2 },
  overlaySub: { color: INK, fontFamily: "monospace", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  restartBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: INK, marginTop: 4 },
  restartText: { color: INK, fontFamily: "monospace", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
});
