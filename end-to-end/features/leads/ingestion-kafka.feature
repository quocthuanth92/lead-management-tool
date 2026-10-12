@us6 @kafka
Feature: Lead ingestion via Kafka events
  As an external lead source
  I want my enquiry events to be processed reliably
  So that every valid enquiry reaches a salesperson exactly once

  Scenario: A valid event appears in the assigned inbox within 60 seconds
    When I publish a valid lead event to Kafka
    Then the event lead appears unread in the assigned salesperson inbox within 60 seconds

  Scenario: Duplicate delivery of the same event creates one lead
    When I publish a valid lead event to Kafka
    And I publish the same lead event again
    Then the event lead appears unread in the assigned salesperson inbox within 60 seconds
    And exactly one lead exists for the event

  Scenario: An invalid event is written to the dead-letter topic
    When I publish an invalid lead event to Kafka
    Then one dead-letter message is recorded for the event within 60 seconds
