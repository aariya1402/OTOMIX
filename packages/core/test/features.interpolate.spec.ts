import { describe, it, expect } from 'vitest';
import { interpolateMissingFeatures } from '../src/features/interpolate';

describe('Interpolate Missing Features (P05-T02-S03-M01)', () => {
  it('T1: interpolates missing danceability from house median', () => {
    const features = { bpm: 120, energy: 0.8 };
    const options = {
      genre: 'house',
      medians: { house: { danceability: 1.2 } }
    };
    const result = interpolateMissingFeatures(features, options);
    expect(result.features.danceability).toBe(1.2);
    expect(result.interpolated_fields).toEqual(['danceability']);
  });

  it('T2: no missing fields -> interpolated_fields is empty', () => {
    const features = { bpm: 120, danceability: 1.5 };
    const options = {
      genre: 'house',
      medians: { house: { danceability: 1.2 } }
    };
    const result = interpolateMissingFeatures(features, options);
    expect(result.interpolated_fields).toEqual([]);
  });

  it('T3: genre not in medians -> nothing interpolated', () => {
    const features = { bpm: 120 };
    const options = { genre: 'unknown-genre', medians: { house: { danceability: 1.2 } } };
    const result = interpolateMissingFeatures(features, options);
    expect(result.interpolated_fields).toEqual([]);
    expect(result.features.bpm).toBe(120);
  });

  it('T4: multiple missing fields are all filled', () => {
    const features = { bpm: 120 };
    const options = {
      genre: 'house',
      medians: { house: { danceability: 1.2, energy: 0.5 } }
    };
    const result = interpolateMissingFeatures(features, options);
    expect(result.features.danceability).toBe(1.2);
    expect(result.features.energy).toBe(0.5);
    expect(result.interpolated_fields.sort()).toEqual(['danceability', 'energy']);
  });

  it('T5: non-finite existing value treated as missing', () => {
    const features = { bpm: 120, danceability: NaN };
    const options = {
      genre: 'house',
      medians: { house: { danceability: 1.2 } }
    };
    const result = interpolateMissingFeatures(features, options);
    expect(result.features.danceability).toBe(1.2);
    expect(result.interpolated_fields).toEqual(['danceability']);
  });

  it('T6: does not mutate the input object', () => {
    const features = { bpm: 120 };
    const options = {
      genre: 'house',
      medians: { house: { danceability: 1.2 } }
    };
    interpolateMissingFeatures(features, options);
    expect(features).not.toHaveProperty('danceability');
  });
});