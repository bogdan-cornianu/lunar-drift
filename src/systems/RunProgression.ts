import {
  CLEAN_LANDING_REFUEL,
  FUEL_MAX,
  MAX_TERRAIN_ROUGHNESS,
  MAX_WIND,
  MIN_PAD_WIDTH_SCALE,
  ROUGH_LANDING_REFUEL,
  STANDARD_LANDING_REFUEL,
} from '../config';
import {
  DEFAULT_DIFFICULTY,
  DifficultyLevel,
  getDifficultyProfile,
} from './Difficulty';
import { LandingGrade } from './Scoring';

export interface SiteDifficulty {
  site: number;
  difficulty: DifficultyLevel;
  terrainRoughness: number;
  padWidthScale: number;
  windX: number;
}

export type Objective =
  | { kind: 'safe'; label: 'LAND SAFELY' }
  | { kind: 'fuel'; label: string; fuelMin: number }
  | { kind: 'pad'; label: string; multiplierMin: number }
  | { kind: 'gentle'; label: string; vyMax: number };

export interface ObjectiveInput {
  fuelRemaining: number;
  multiplier: number;
  vy: number;
}

export interface LandingOutcome {
  grade: LandingGrade;
  objectiveMet: boolean;
  nextFuel: number;
}

export class RunProgression {
  site = 1;
  streak = 0;
  objective: Objective = { kind: 'safe', label: 'LAND SAFELY' };

  constructor(private difficulty: DifficultyLevel = DEFAULT_DIFFICULTY) {}

  getDifficulty(): SiteDifficulty {
    const profile = getDifficultyProfile(this.difficulty);
    const tier = Math.max(0, this.site - 1);
    const windDirection = this.site % 2 === 0 ? 1 : -1;
    const windMagnitude =
      this.site < profile.windStartSite
        ? 0
        : Math.min(MAX_WIND, (4 + tier * 1.6) * profile.windScale);
    const windX = windMagnitude === 0 ? 0 : windDirection * windMagnitude;
    const terrainRoughness = Math.min(
      MAX_TERRAIN_ROUGHNESS,
      (0.56 + tier * 0.035) * profile.terrainRoughnessScale,
    );
    const padWidthScale = Math.max(
      MIN_PAD_WIDTH_SCALE,
      (1 - tier * 0.035) * profile.padWidthScale,
    );

    return {
      site: this.site,
      difficulty: this.difficulty,
      terrainRoughness,
      padWidthScale,
      windX,
    };
  }

  prepareSite(seed: number): void {
    this.objective = this.makeObjective(seed);
  }

  resolveLanding(input: ObjectiveInput & { grade: LandingGrade }): LandingOutcome {
    const objectiveMet = this.isObjectiveMet(input);
    this.streak = input.grade === 'PERFECT' || input.grade === 'GOOD' ? this.streak + 1 : 0;

    return {
      grade: input.grade,
      objectiveMet,
      nextFuel: Math.round(FUEL_MAX * this.refuelRatio(input.grade, objectiveMet)),
    };
  }

  advanceSite(): void {
    this.site += 1;
  }

  resetStreak(): void {
    this.streak = 0;
  }

  private makeObjective(seed: number): Objective {
    const profile = getDifficultyProfile(this.difficulty);
    if (this.site <= 2) return { kind: 'safe', label: 'LAND SAFELY' };

    const choice = (seed + this.site) % 3;
    if (choice === 0) {
      const fuelMin = Math.max(
        20,
        (this.site < 6 ? 40 : 50) + profile.objectiveFuelAdjustment,
      );
      return { kind: 'fuel', label: `LAND WITH ${fuelMin}+ FUEL`, fuelMin };
    }
    if (choice === 1) {
      const multiplierMin = this.site < 5 ? 5 : 10;
      return { kind: 'pad', label: `LAND ON ${multiplierMin}X PAD`, multiplierMin };
    }
    const vyMax = Math.max(
      10,
      (this.site < 7 ? 20 : 16) + profile.objectiveGentleVyAdjustment,
    );
    return { kind: 'gentle', label: `TOUCH DOWN VY <= ${vyMax}`, vyMax };
  }

  private isObjectiveMet(input: ObjectiveInput): boolean {
    if (this.objective.kind === 'safe') return true;
    if (this.objective.kind === 'fuel') return input.fuelRemaining >= this.objective.fuelMin;
    if (this.objective.kind === 'pad') return input.multiplier >= this.objective.multiplierMin;
    return Math.abs(input.vy) <= this.objective.vyMax;
  }

  private refuelRatio(grade: LandingGrade, objectiveMet: boolean): number {
    const profile = getDifficultyProfile(this.difficulty);
    const objectiveBoost = objectiveMet ? 0.08 : 0;
    if (grade === 'PERFECT') return CLEAN_LANDING_REFUEL;
    if (grade === 'GOOD') {
      return Math.min(
        1,
        Math.max(0, STANDARD_LANDING_REFUEL + objectiveBoost + profile.refuelAdjustment),
      );
    }
    return Math.min(
      1,
      Math.max(0, ROUGH_LANDING_REFUEL + objectiveBoost + profile.refuelAdjustment),
    );
  }
}
