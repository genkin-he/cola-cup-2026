class CreateOddsSnapshots < ActiveRecord::Migration[8.1]
  def change
    create_table :odds_snapshots do |t|
      t.references :match, null: false, foreign_key: true
      t.string :source, null: false
      t.boolean :locked, null: false, default: false
      t.float :p_home
      t.float :p_draw
      t.float :p_away
      t.float :d_home
      t.float :d_draw
      t.float :d_away
      t.datetime :taken_at, null: false

      t.timestamps
    end

    add_index :odds_snapshots, [ :match_id, :source, :locked ]
  end
end
