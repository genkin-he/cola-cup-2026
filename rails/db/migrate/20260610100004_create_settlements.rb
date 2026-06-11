class CreateSettlements < ActiveRecord::Migration[8.1]
  def change
    create_table :settlements do |t|
      t.references :created_by, foreign_key: { to_table: :users }
      t.integer :match_count, null: false, default: 0

      t.timestamps
    end
  end
end
