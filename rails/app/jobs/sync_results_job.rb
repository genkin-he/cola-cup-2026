class SyncResultsJob < ApplicationJob
  queue_as :default

  def perform
    result = FootballData::ResultsSync.run
    Rails.logger.info(
      "[SyncResultsJob] recorded=#{result[:recorded]} skipped=#{result[:skipped]} unmatched=#{result[:unmatched]}"
    )
  end
end
