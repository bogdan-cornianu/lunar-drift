import {
  CLEAN_LANDING_REFUEL,
  FUEL_MAX,
  MAX_TERRAIN_ROUGHNESS,
  MAX_WIND,
  MIN_PAD_WIDTH_SCALE,
  ROUGH_LANDING_REFUEL,
  STANDARD_LANDING_REFUEL,
} from '../config';
import { LandingGrade } from './Scoring';

export interface SiteDifficulty {
  site: number;
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

  getDifficulty(): SiteDifficulty {
    const tier = Math.max(0, this.site - 1);
    const windDirection = this.site % 2 === 0 ? 1 : -1;
    const windMagnitude = this.site < 4 ? 0 : Math.min(MAX_WIND, 4 + tier * 1.6);
    const windX = windMagnitude === 0 ? 0 : windDirection * windMagnitude;

    return {
      site: this.site,
      terrainRoughness: Math.min(MAX_TERRAIN_ROUGHNESS, 0.56 + tier * 0.035),
      padWidthScale: Math.max(MIN_PAD_WIDTH_SCALE, 1 - tier * 0.035),
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
    if (this.site <= 2) return { kind: 'safe', label: 'LAND SAFELY' };

    const choice = (seed + this.site) % 3;
    if (choice === 0) {
      const fuelMin = this.site < 6 ? 40 : 50;
      return { kind: 'fuel', label: `LAND WITH ${fuelMin}+ FUEL`, fuelMin };
    }
    if (choice === 1) {
      const multiplierMin = this.site < 5 ? 5 : 10;
      return { kind: 'pad', label: `LAND ON ${multiplierMin}X PAD`, multiplierMin };
    }
    const vyMax = this.site < 7 ? 20 : 16;
    return { kind: 'gentle', label: `TOUCH DOWN VY <= ${vyMax}`, vyMax };
  }

  private isObjectiveMet(input: ObjectiveInput): boolean {
    if (this.objective.kind === 'safe') return true;
    if (this.objective.kind === 'fuel') return input.fuelRemaining >= this.objective.fuelMin;
    if (this.objective.kind === 'pad') return input.multiplier >= this.objective.multiplierMin;
    return Math.abs(input.vy) <= this.objective.vyMax;
  }

  private refuelRatio(grade: LandingGrade, objectiveMet: boolean): number {
    const objectiveBoost = objectiveMet ? 0.08 : 0;
    if (grade === 'PERFECT') return CLEAN_LANDING_REFUEL;
    if (grade === 'GOOD') return Math.min(1, STANDARD_LANDING_REFUEL + objectiveBoost);
    return Math.min(1, ROUGH_LANDING_REFUEL + objectiveBoost);
  }
}
