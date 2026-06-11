class FetchOddsJob < ApplicationJob
  queue_as :default

  def perform
    result = Polymarket::Sync.run
    Rails.logger.info(
      "[FetchOddsJob] events=#{result[:events]} matched=#{result[:matched]} unmatched=#{result[:unmatched]}"
    )
  end
end
