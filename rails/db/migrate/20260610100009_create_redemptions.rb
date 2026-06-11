class CreateRedemptions < ActiveRecord::Migration[8.1]
  def change
    create_table :redemptions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :drink, null: false
      t.integer :qty, null: false
      t.float :unit_cost, null: false
      t.float :cost, null: false

      t.timestamps
    end
  end
end
