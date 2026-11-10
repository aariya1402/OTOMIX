// OTOMIX §9.6; §4.2 · Mother Add. §1–§2; §3.2
declare const __featureRegistryBrand: unique symbol;

export type FeatureRegistryV1_2 = Record<string, unknown> & { readonly [__featureRegistryBrand]: true };

export type RegistryValidationResult =
  | { ok: true; value: FeatureRegistryV1_2 }
  | { ok: false; error: 'INVALID_ARGUMENT'; message: string };
