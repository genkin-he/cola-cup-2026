class CreateVotes < ActiveRecord::Migration[8.1]
  def change
    create_table :votes do |t|
      t.references :match, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :pick, null: false
      t.float :stake, null: false

      t.timestamps
    end

    add_index :votes, [ :match_id, :user_id ], unique: true
  end
end
