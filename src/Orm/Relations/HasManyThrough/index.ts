/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Model'
import { HasManyThroughRelationContract, ThroughRelationOptions } from '@ioc:Adonis/Lucid/Relations'

import { BaseRelation } from '../Base'
import { HasManyThroughClient } from './QueryClient'

/**
 * Manages loading and persisting has many through relationship
 */
export class HasManyThrough extends BaseRelation implements HasManyThroughRelationContract<
ModelConstructorContract,
ModelConstructorContract
> {
  public $type = 'hasManyThrough' as const

  public $throughModel = this.throughOptions.throughModel

  /**
   * Available after boot is invoked
   */
  public $localKey: string
  public $localCastAsKey: string

  /**
   * This exists on the through model
   */
  public $foreignKey: string
  public $foreignCastAsKey: string

  /**
   * This exists on the through model
   */
  public $throughLocalKey: string
  public $throughLocalCastAsKey: string

  /**
   * This exists on the related model
   */
  public $throughForeignKey: string
  public $throughForeignCastAsKey: string

  public get $profilerData () {
    return {
      model: this.$model.name,
      relatedModel: this.$relatedModel().name,
      throughModel: this.$throughModel().name,
      relation: this.$type,
    }
  }

  constructor (
    relationName: string,
    private throughOptions: ThroughRelationOptions,
    model: ModelConstructorContract,
  ) {
    super(relationName, throughOptions, model)
  }

  /**
   * Returns the alias for the through key
   */
  public throughAlias (key) {
    return `through_${key}`
  }

  /**
   * Boot the relationship and ensure that all keys are in
   * place for queries to do their job.
   */
  public $boot () {
    if (this.$booted) {
      return
    }

    /**
     * Extracting keys from the model and the relation model. The keys
     * extractor ensures all the required columns are defined on
     * the models for the relationship to work
     */
    const { localKey, foreignKey, throughLocalKey, throughForeignKey } = this.$extractKeys({
      localKey: {
        model: this.$model,
        key: (
          this.throughOptions.localKey ||
          this.$model.$configurator.getLocalKey(this.$type, this.$model, this.$relatedModel())
        ),
      },
      foreignKey: {
        model: this.$throughModel(),
        key: (
          this.throughOptions.foreignKey ||
          this.$model.$configurator.getForeignKey(this.$type, this.$model, this.$throughModel())
        ),
      },
      throughLocalKey: {
        model: this.$throughModel(),
        key: (
          this.throughOptions.throughLocalKey ||
          this.$model.$configurator.getLocalKey(this.$type, this.$throughModel(), this.$relatedModel())
        ),
      },
      throughForeignKey: {
        model: this.$relatedModel(),
        key: (
          this.throughOptions.throughForeignKey ||
          this.$model.$configurator.getForeignKey(this.$type, this.$throughModel(), this.$relatedModel())
        ),
      },
    })

    /**
     * Keys on the parent model
     */
    this.$localKey = localKey.attributeName
    this.$localCastAsKey = localKey.castAsKey

    /**
     * Keys on the through model
     */
    this.$foreignKey = foreignKey.attributeName
    this.$foreignCastAsKey = foreignKey.castAsKey

    this.$throughLocalKey = throughLocalKey.attributeName
    this.$throughLocalCastAsKey = throughLocalKey.castAsKey

    this.$throughForeignKey = throughForeignKey.attributeName
    this.$throughForeignCastAsKey = throughForeignKey.castAsKey

    /**
     * Booted successfully
     */
    this.$booted = true
  }

  /**
   * Set related model instances
   */
  public $setRelated (parent: ModelContract, related: ModelContract[]): void {
    this.$ensureIsBooted()
    parent.$setRelated(this.$relationName as any, related)
  }

  /**
   * Push related model instance(s)
   */
  public $pushRelated (parent: ModelContract, related: ModelContract | ModelContract[]): void {
    this.$ensureIsBooted()
    parent.$pushRelated(this.$relationName as any, related as any)
  }

  /**
   * Finds and set the related model instances next to the parent
   * models.
   */
  public $setRelatedForMany (parent: ModelContract[], related: ModelContract[]): void {
    this.$ensureIsBooted()
    const $foreignCastAsKeyAlias = this.throughAlias(this.$foreignCastAsKey)

    parent.forEach((parentModel) => {
      this.$setRelated(parentModel, related.filter((relatedModel) => {
        const value = parentModel[this.$localKey]
        return value !== undefined && relatedModel.$extras[$foreignCastAsKeyAlias] === value
      }))
    })
  }

  /**
   * Returns an instance of query client for invoking queries
   */
  public client (parent: ModelContract | ModelContract[], client: QueryClientContract): any {
    this.$ensureIsBooted()
    return new HasManyThroughClient(parent, client, this)
  }
}
