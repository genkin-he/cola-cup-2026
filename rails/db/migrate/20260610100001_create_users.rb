class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :nickname, null: false
      t.string :avatar_url
      t.string :emoji
      t.datetime :deleted_at
      t.string :encrypted_password, null: false, default: ""
      t.datetime :remember_created_at

      t.timestamps
    end

    add_index :users, :deleted_at
  end
end
