# One settled row per user per match, holding the raw (un-rounded) pari-mutuel
# delta. The unique (match_id, user_id) index is the idempotency basis: a repeat
# settlement insert is a no-op (ON CONFLICT DO NOTHING via insert_all).
class LedgerEntry < ApplicationRecord
  belongs_to :match
  belongs_to :user

  validates :pick, presence: true
  validates :stake, :d_used, :delta, presence: true
end
