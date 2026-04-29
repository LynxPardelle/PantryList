import { ProductCategory, QuantityUnit } from '../enums';
import { ProductTypeId } from '../value-objects/product-type-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export interface ProductTypePrimitives {
  id: string;
  userId: string;
  baseName: string;
  category: ProductCategory;
  defaultUnit: QuantityUnit;
  defaultDepletionRule?: DepletionRulePrimitives;
  planningSettings?: ProductTypePlanningSettingsPrimitives;
  archivedAt?: Date;
  archivedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DepletionPeriod = 'day' | 'week' | 'month';

export interface DepletionRulePrimitives {
  enabled: boolean;
  consumeAmount: number;
  unit: QuantityUnit;
  everyAmount: number;
  everyPeriod: DepletionPeriod;
  anchorDate: Date;
}

export interface ProductTypePlanningSettingsPrimitives {
  planningEnabled: boolean;
  expirationWarningDaysOverride?: number;
  depletionWarningThresholdRatioOverride?: number;
  shoppingPlanLeadDaysOverride?: number;
}

export type ProductTypePlanningSettingsPatch =
  Partial<ProductTypePlanningSettingsPrimitives>;

export class ProductType {
  private constructor(
    private readonly _id: ProductTypeId,
    private readonly _userId: UserId,
    private _baseName: string,
    private _category: ProductCategory,
    private _defaultUnit: QuantityUnit,
    private _defaultDepletionRule: DepletionRulePrimitives | undefined,
    private _planningSettings: ProductTypePlanningSettingsPrimitives,
    private _archivedAt: Date | undefined,
    private _archivedReason: string | undefined,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  ) {}

  static create(
    userId: UserId,
    baseName: string,
    category: ProductCategory,
    defaultUnit: QuantityUnit,
    defaultDepletionRule?: DepletionRulePrimitives,
  ): ProductType {
    const normalizedBaseName = baseName.trim();

    if (!normalizedBaseName) {
      throw new Error('Base name cannot be empty');
    }

    return new ProductType(
      ProductTypeId.generate(),
      userId,
      normalizedBaseName,
      category,
      defaultUnit,
      normalizeDefaultDepletionRule(defaultDepletionRule, defaultUnit),
      normalizePlanningSettings(undefined, defaultDepletionRule),
      undefined,
      undefined,
    );
  }

  static fromPrimitives(primitives: ProductTypePrimitives): ProductType {
    const defaultDepletionRule = normalizeDefaultDepletionRule(
      primitives.defaultDepletionRule,
      primitives.defaultUnit,
    );

    return new ProductType(
      ProductTypeId.fromString(primitives.id),
      UserId.fromString(primitives.userId),
      primitives.baseName,
      primitives.category,
      primitives.defaultUnit,
      defaultDepletionRule,
      normalizePlanningSettings(
        primitives.planningSettings,
        defaultDepletionRule,
      ),
      primitives.archivedAt ? new Date(primitives.archivedAt) : undefined,
      normalizeOptionalText(primitives.archivedReason),
      primitives.createdAt,
      primitives.updatedAt,
    );
  }

  get id(): ProductTypeId {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get baseName(): string {
    return this._baseName;
  }

  get category(): ProductCategory {
    return this._category;
  }

  get defaultUnit(): QuantityUnit {
    return this._defaultUnit;
  }

  get defaultDepletionRule(): DepletionRulePrimitives | undefined {
    return cloneDefaultDepletionRule(this._defaultDepletionRule);
  }

  get planningSettings(): ProductTypePlanningSettingsPrimitives {
    return clonePlanningSettings(this._planningSettings);
  }

  get archivedAt(): Date | undefined {
    return this._archivedAt ? new Date(this._archivedAt) : undefined;
  }

  get archivedReason(): string | undefined {
    return this._archivedReason;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateDefaultDepletionRule(
    defaultDepletionRule?: DepletionRulePrimitives,
  ): void {
    this._defaultDepletionRule = normalizeDefaultDepletionRule(
      defaultDepletionRule,
      this._defaultUnit,
    );
    this._planningSettings = normalizePlanningSettings(
      this._planningSettings,
      this._defaultDepletionRule,
    );
    this._updatedAt = new Date();
  }

  updatePlanningSettings(input: ProductTypePlanningSettingsPatch): void {
    this._planningSettings = normalizePlanningSettings(
      {
        ...this._planningSettings,
        ...input,
      },
      this._defaultDepletionRule,
    );
    this._updatedAt = new Date();
  }

  archive(reason?: string): void {
    this._archivedAt = new Date();
    this._archivedReason = normalizeOptionalText(reason);
    this._updatedAt = new Date();
  }

  restore(): void {
    this._archivedAt = undefined;
    this._archivedReason = undefined;
    this._updatedAt = new Date();
  }

  isArchived(): boolean {
    return Boolean(this._archivedAt);
  }

  assertDeleteConfirmation(confirmationText: string): void {
    if (confirmationText.trim() !== this._baseName) {
      throw new Error('Delete confirmation must match product type base name');
    }
  }

  canDeletePermanently(): boolean {
    return this.isArchived();
  }

  toPrimitives(): ProductTypePrimitives {
    return {
      id: this._id.toString(),
      userId: this._userId.toString(),
      baseName: this._baseName,
      category: this._category,
      defaultUnit: this._defaultUnit,
      defaultDepletionRule: cloneDefaultDepletionRule(
        this._defaultDepletionRule,
      ),
      planningSettings: clonePlanningSettings(this._planningSettings),
      archivedAt: this._archivedAt ? new Date(this._archivedAt) : undefined,
      archivedReason: this._archivedReason,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

function normalizeDefaultDepletionRule(
  rule: DepletionRulePrimitives | undefined,
  defaultUnit: QuantityUnit,
): DepletionRulePrimitives | undefined {
  if (!rule) {
    return undefined;
  }

  if (rule.consumeAmount <= 0) {
    throw new Error('Depletion consume amount must be greater than zero');
  }

  if (rule.everyAmount <= 0) {
    throw new Error('Depletion interval amount must be greater than zero');
  }

  if (rule.unit !== defaultUnit) {
    throw new Error('Depletion rule unit must match product type default unit');
  }

  if (!['day', 'week', 'month'].includes(rule.everyPeriod)) {
    throw new Error('Unsupported depletion interval period');
  }

  return {
    ...rule,
    anchorDate: new Date(rule.anchorDate),
  };
}

function normalizePlanningSettings(
  settings: ProductTypePlanningSettingsPatch | undefined,
  defaultDepletionRule: DepletionRulePrimitives | undefined,
): ProductTypePlanningSettingsPrimitives {
  const planningEnabled =
    settings?.planningEnabled ?? Boolean(defaultDepletionRule?.enabled);

  if (typeof planningEnabled !== 'boolean') {
    throw new Error('Planning enabled must be a boolean');
  }

  const normalized: ProductTypePlanningSettingsPrimitives = {
    planningEnabled,
  };

  if (settings?.expirationWarningDaysOverride !== undefined) {
    assertNumberBetween(
      settings.expirationWarningDaysOverride,
      1,
      60,
      'Expiration warning days override must be between 1 and 60',
    );
    normalized.expirationWarningDaysOverride = Math.trunc(
      settings.expirationWarningDaysOverride,
    );
  }

  if (settings?.depletionWarningThresholdRatioOverride !== undefined) {
    assertNumberBetween(
      settings.depletionWarningThresholdRatioOverride,
      0.25,
      4,
      'Depletion warning threshold ratio override must be between 0.25 and 4',
    );
    normalized.depletionWarningThresholdRatioOverride = Number(
      settings.depletionWarningThresholdRatioOverride.toFixed(2),
    );
  }

  if (settings?.shoppingPlanLeadDaysOverride !== undefined) {
    assertNumberBetween(
      settings.shoppingPlanLeadDaysOverride,
      0,
      30,
      'Shopping plan lead days override must be between 0 and 30',
    );
    normalized.shoppingPlanLeadDaysOverride = Math.trunc(
      settings.shoppingPlanLeadDaysOverride,
    );
  }

  return normalized;
}

function clonePlanningSettings(
  settings: ProductTypePlanningSettingsPrimitives,
): ProductTypePlanningSettingsPrimitives {
  return { ...settings };
}

function assertNumberBetween(
  value: number,
  min: number,
  max: number,
  message: string,
): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(message);
  }
}

function normalizeOptionalText(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function cloneDefaultDepletionRule(
  rule: DepletionRulePrimitives | undefined,
): DepletionRulePrimitives | undefined {
  if (!rule) {
    return undefined;
  }

  return {
    ...rule,
    anchorDate: new Date(rule.anchorDate),
  };
}
