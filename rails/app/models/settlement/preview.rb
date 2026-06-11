class Settlement
  # Result of a dry-run settlement (Settlement.preview). `matches` and `users`
  # carry plain value objects; `skipped` is an array of { match_id:, reason: }.
  class Preview
    # A match included in the preview, with its full voter roster.
    Match = Struct.new(:match_id, :result, :home_score, :away_score, :voters, :votes, keyword_init: true)
    # A voter line in the roster — always the complete list, so the admin UI can
    # render a toggleable per-match opt-in checklist.
    RosterVote = Struct.new(:user_id, :nickname, :emoji, :pick, :stake, keyword_init: true)
    # A bettor's net buy/receive across the previewed matches.
    User = Struct.new(:user_id, :nickname, :emoji, :net, keyword_init: true)

    attr_reader :matches, :skipped, :users, :error

    def initialize(ok:, error:, matches:, skipped:, users:)
      @ok = ok
      @error = error
      @matches = matches
      @skipped = skipped
      @users = users
    end

    def ok?
      @ok
    end
  end
end
