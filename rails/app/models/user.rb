class User < ApplicationRecord
  # database_authenticatable is only the Warden base — there is no password entry
  # (sessions/registrations/passwords routes are skipped); login is Twitter-only.
  devise :database_authenticatable, :rememberable, :omniauthable,
    omniauth_providers: [ :twitter2 ]

  MAX_NICKNAME = 16
  FALLBACK_NICKNAME = "球迷"
  # OmniAuth strategy is "twitter2"; we normalise the stored provider to "twitter"
  # so legacy data and SETTLER_USERNAMES matching stay unchanged.
  PROVIDER = "twitter"

  has_many :accounts, dependent: :destroy
  has_many :votes, dependent: :destroy
  has_many :ledger_entries, dependent: :destroy
  has_many :redemptions, dependent: :destroy

  validates :nickname, presence: true, length: { maximum: MAX_NICKNAME }

  scope :active, -> { where(deleted_at: nil) }

  # Soft delete/restore changes who appears across the app; a nickname/emoji edit
  # only updates display. Avatar refreshes on login are intentionally not broadcast.
  after_commit :broadcast_user_change, on: :update

  def broadcast_user_change
    if saved_change_to_deleted_at?
      Broadcasts::UserVisibilityJob.perform_later(id)
    elsif saved_change_to_nickname? || saved_change_to_emoji?
      Broadcasts::ProfileJob.perform_later(id)
    end
  end

  # Leaderboard ranked by total score (Σ delta) — pure betting performance,
  # redemptions reported alongside but never lower the rank. One query; returns
  # User rows carrying the extra total / redeemed / bets / wins attributes.
  # Soft-deleted users are excluded.
  def self.leaderboard
    active
      .select(
        "users.id, users.avatar_url, users.emoji, users.nickname, users.created_at",
        "COALESCE((SELECT SUM(delta) FROM ledger_entries WHERE user_id = users.id), 0) AS total",
        "COALESCE((SELECT SUM(cost) FROM redemptions WHERE user_id = users.id), 0) AS redeemed",
        "(SELECT COUNT(*) FROM ledger_entries WHERE user_id = users.id) AS bets",
        "COALESCE((SELECT SUM(won) FROM ledger_entries WHERE user_id = users.id), 0) AS wins"
      )
      .order(Arel.sql("total DESC, bets DESC, users.created_at ASC"))
  end

  # Link an OAuth identity to a user, creating the user on first login. The
  # provider handle and avatar refresh on every login; the user's edited nickname
  # and emoji are never overwritten. Ports the legacy upsertOAuthUser.
  def self.from_omniauth(auth)
    provider_account_id = auth.uid.to_s
    username = auth.info.nickname.presence
    avatar_url = normalize_avatar(auth.info.image)

    account = Account.find_by(provider: PROVIDER, provider_account_id: provider_account_id)
    if account
      account.update!(username: username, avatar_url: avatar_url)
      account.user.update!(avatar_url: avatar_url) # nickname / emoji untouched
      return account.user
    end

    transaction do
      user = create!(nickname: nickname_from(auth.info.name), avatar_url: avatar_url)
      user.accounts.create!(
        provider: PROVIDER, provider_account_id: provider_account_id,
        username: username, avatar_url: avatar_url
      )
      user
    end
  end

  # Twitter serves a 48px "_normal" avatar; request the 400px variant instead.
  def self.normalize_avatar(url)
    url.presence&.sub("_normal", "_400x400")
  end

  def self.nickname_from(name)
    (name.presence || FALLBACK_NICKNAME).to_s[0, MAX_NICKNAME]
  end

  # Available balance = settled net (Σ ledger delta) − credits spent on drinks.
  def net_balance
    ledger_entries.sum(:delta) - redemptions.sum(:cost)
  end

  def soft_delete!
    update!(deleted_at: Time.current) if deleted_at.nil?
  end

  def restore!
    update!(deleted_at: nil)
  end

  def deleted?
    deleted_at.present?
  end

  def settler?
    Settler.settler?(self)
  end

  # Display handle for the admin roster — the earliest linked account's username.
  def primary_handle
    accounts.min_by(&:created_at)&.username
  end

  # Soft-deleted users cannot sign in (Devise checks this on every authentication).
  def active_for_authentication?
    super && !deleted?
  end

  def inactive_message
    deleted? ? :deleted_account : super
  end
end
