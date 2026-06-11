class CreateTeams < ActiveRecord::Migration[8.1]
  def change
    create_table :teams do |t|
      t.string :code
      t.string :name, null: false
      t.string :name_zh
      t.string :flag
      t.string :confed
      t.json :aliases

      t.timestamps
    end

    add_index :teams, :name, unique: true
  end
end
