class CreateMatches < ActiveRecord::Migration[8.1]
  def change
    create_table :matches do |t|
      t.string :external_key, null: false
      t.string :group_name
      t.string :stage, null: false
      t.references :home_team, foreign_key: { to_table: :teams }
      t.references :away_team, foreign_key: { to_table: :teams }
      t.string :home_label
      t.string :away_label
      t.string :venue
      t.datetime :kickoff_at, null: false
      t.string :result
      t.integer :home_score
      t.integer :away_score
      t.datetime :result_at
      t.boolean :settled, null: false, default: false
      t.references :settlement, foreign_key: true

      t.timestamps
    end

    add_index :matches, :external_key, unique: true
    add_index :matches, :kickoff_at
    add_index :matches, :stage
  end
end
