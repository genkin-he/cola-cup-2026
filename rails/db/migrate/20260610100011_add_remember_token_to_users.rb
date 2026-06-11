class AddRememberTokenToUsers < ActiveRecord::Migration[8.1]
  # Devise :rememberable derives its cookie token from the password salt, but
  # these users are password-less (Twitter-only). A dedicated remember_token
  # column gives rememberable a stable value to persist instead.
  def change
    add_column :users, :remember_token, :string
  end
end
