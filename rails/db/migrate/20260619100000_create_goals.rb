class CreateGoals < ActiveRecord::Migration[8.1]
  def change
    create_table :goals do |t|
      t.references :match, null: false, foreign_key: true
      t.references :team, foreign_key: { to_table: :teams }
      t.string :player_name, null: false
      t.integer :minute
      t.boolean :penalty, null: false, default: false
      t.boolean :own_goal, null: false, default: false
      t.timestamps
    end

    add_index :goals, [ :player_name, :team_id ]
  end
end
