# In-memory lookup tables shared by the Polymarket and football-data matchers.
# Ported from the legacy src/scripts/matchPolymarket.ts: it indexes team names
# (plus aliases) for fuzzy resolution and indexes fixtures by their unordered
# team pair so either feed can map an external event back to one of our matches.
class MatchIndex
  COMBINING_MARKS = /\p{Mn}/
  NON_ALPHANUMERIC = /[^a-z0-9 ]/

  def self.normalize(value)
    value.to_s
         .unicode_normalize(:nfd)
         .gsub(COMBINING_MARKS, "")
         .downcase
         .gsub(NON_ALPHANUMERIC, " ")
         .gsub(/\s+/, " ")
         .strip
  end

  def self.build
    teams = Team.all.to_a
    matches = Match.where.not(home_team_id: nil).where.not(away_team_id: nil).to_a
    new(teams, matches)
  end

  def initialize(teams, matches)
    @name_to_team_id = {}
    teams.each do |team|
      @name_to_team_id[self.class.normalize(team.name)] = team.id
      Array(team.aliases).each do |team_alias|
        @name_to_team_id[self.class.normalize(team_alias)] = team.id
      end
    end

    @pair_to_match = {}
    matches.each do |match|
      key = pair_key(match.home_team_id, match.away_team_id)
      @pair_to_match[key] = {
        match_id: match.id,
        home_id: match.home_team_id,
        away_id: match.away_team_id
      }
    end
  end

  # Resolve an external team name to one of our team ids: exact normalized
  # match first, then a token-subset match (either name's tokens contained in
  # the other's), returning the first index hit.
  def resolve_team(external_name)
    normalized = self.class.normalize(external_name)
    exact = @name_to_team_id[normalized]
    return exact unless exact.nil?

    external_tokens = normalized.split(" ").reject(&:empty?)
    @name_to_team_id.each do |name, id|
      tokens = name.split(" ").reject(&:empty?)
      external_subset = external_tokens.all? { |token| tokens.include?(token) }
      index_subset = tokens.all? { |token| external_tokens.include?(token) }
      return id if external_subset || index_subset
    end
    nil
  end

  def pair_match(team_id_a, team_id_b)
    @pair_to_match[pair_key(team_id_a, team_id_b)]
  end

  private

  def pair_key(team_id_a, team_id_b)
    team_id_a < team_id_b ? "#{team_id_a}-#{team_id_b}" : "#{team_id_b}-#{team_id_a}"
  end
end
