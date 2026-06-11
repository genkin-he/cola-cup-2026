class CreateLedgerEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :ledger_entries do |t|
      t.references :match, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :pick, null: false
      t.float :stake, null: false
      t.float :d_used, null: false
      t.boolean :won, null: false
      t.float :delta, null: false

      t.timestamps
    end

    add_index :ledger_entries, [ :match_id, :user_id ], unique: true
  end
end
