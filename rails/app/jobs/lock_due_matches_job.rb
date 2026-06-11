class LockDueMatchesJob < ApplicationJob
  queue_as :default

  def perform
    Match.due_for_lock.find_each { |match| match.ensure_locked_odds!(now: Time.current) }
  end
end
