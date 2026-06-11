class CreateAccounts < ActiveRecord::Migration[8.1]
  def change
    create_table :accounts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :provider_account_id, null: false
      t.string :username
      t.string :avatar_url

      t.timestamps
    end

    add_index :accounts, [ :provider, :provider_account_id ], unique: true
  end
end
