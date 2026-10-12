Feature: Lead UI journey
  As a salesperson
  I want to triage my leads in the browser
  So that I can find, open, label and annotate them

  @ui @web @us1 @us2 @us3 @us4 @us5
  Scenario: Salesperson works a lead from sign-in to the updated inbox
    Given a new lead is ingested through the internal API
    When I sign in through the browser as the lead owner
    Then the browser inbox shows the lead as unread
    When I search the browser inbox for the lead name
    And I open the lead from the browser inbox
    And I change the lead label in the browser to "POTENTIAL"
    And I add the note "UI journey note" in the browser
    And I return to the browser inbox
    Then the browser inbox shows the lead as read with the label "Potential"

  @sec @ui @web
  Scenario: Session token is never exposed to the browser
    Given a new lead is ingested through the internal API
    When I sign in through the browser as the lead owner
    Then the session token is absent from the page HTML, scripts, and localStorage
