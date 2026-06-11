class CreatePolyMarkets < ActiveRecord::Migration[8.1]
  def change
    create_table :poly_markets do |t|
      t.references :match, null: false, foreign_key: true, index: { unique: true }
      t.string :event_id
      t.string :slug
      t.string :condition_id
      t.string :token_home
      t.string :token_draw
      t.string :token_away
      t.string :match_method
      t.float :match_score
      t.boolean :closed, null: false, default: false

      t.timestamps
    end
  end
end
