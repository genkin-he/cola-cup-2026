class ImportScheduleJob < ApplicationJob
  queue_as :default

  def perform
    result = Openfootball::ScheduleImport.run(source: :network)
    Rails.logger.info("[ImportScheduleJob] teams=#{result[:teams]} matches=#{result[:matches]}")
  end
end
