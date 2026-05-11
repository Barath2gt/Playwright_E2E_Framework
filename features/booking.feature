@booking
Feature: Room Availability Check and Booking at Shady Meadows B&B
  As a guest
  I want to check room availability and book a room at Shady Meadows B&B
  So that I can secure my accommodation for my desired dates

  Background:
    Given I navigate to the Shady Meadows B&B homepage
    Then the homepage should display the welcome heading

  # ─────────────────────────────────────────────────────────────────────────
  # SMOKE TESTS — Core happy path (direct navigation to avoid availability conflicts)
  # ─────────────────────────────────────────────────────────────────────────

  @smoke
  Scenario: Successfully book a Single room via direct navigation
    Given I navigate directly to the reservation page for "Single" room with check-in "2026-09-01" and check-out "2026-09-05"
    Then the room title should be "Single Room"
    And the price summary should be visible
    When I click Reserve Now
    And I fill in the booking form with the following guest details:
      | firstname | lastname | email              | phone       |
      | John      | Doe      | john.doe@test.com  | 07700123456 |
    And I submit the booking
    Then I should see a booking confirmation message

  @smokes
  Scenario: Successfully book a Double room via direct navigation
    Given I navigate directly to the reservation page for "Double" room with check-in "2026-09-01" and check-out "2026-09-05"
    Then the room title should be "Double Room"
    And the price summary should be visible
    When I click Reserve Now
    And I fill in the booking form with the following guest details:
      | firstname | lastname | email             | phone       |
      | Alice     | Smith    | alice@test.com    | 07700111222 |
    And I submit the booking
    Then I should see a booking confirmation message

  # ─────────────────────────────────────────────────────────────────────────
  # REGRESSION TESTS — Multiple room types via Scenario Outline
  # ─────────────────────────────────────────────────────────────────────────

  @regression
  Scenario Outline: Book different room types with various guest details
    When I enter check-in date "<checkIn>" and check-out date "<checkOut>"
    And I click Check Availability
    Then I should see the available rooms section
    When I click Book Now for "<roomType>" room
    Then I should be on the <roomType> room reservation page
    When I click Reserve Now
    And I fill in the booking form with the following guest details:
      | firstname   | lastname   | email   | phone   |
      | <firstname> | <lastname> | <email> | <phone> |
    And I submit the booking
    Then I should see a booking confirmation message

    Examples:
      | roomType | checkIn    | checkOut   | firstname | lastname | email               | phone       |
      | Single   | 2026-07-01 | 2026-07-03 | James     | Brown    | james@testmail.com  | 07700100200 |
      | Double   | 2026-07-05 | 2026-07-08 | Emma      | Wilson   | emma@testmail.com   | 07700300400 |
      | Suite    | 2026-07-10 | 2026-07-14 | Oliver    | Taylor   | oliver@testmail.com | 07700500600 |

  # ─────────────────────────────────────────────────────────────────────────
  # DIRECT NAVIGATION — Navigate directly to reservation page
  # ─────────────────────────────────────────────────────────────────────────

  @smokes @direct
  Scenario: Directly navigate to reservation page and complete booking
    Given I navigate directly to the reservation page for "Single" room with check-in "2026-09-10" and check-out "2026-09-12"
    Then the room title should be "Single Room"
    And the price summary should be visible
    When I click Reserve Now
    And I fill in the booking form with the following guest details:
      | firstname | lastname | email               | phone       |
      | Carol     | White    | carol.w@test.com    | 07700777888 |
    And I submit the booking
    Then I should see a booking confirmation message

  # ─────────────────────────────────────────────────────────────────────────
  # SUITE ROOM — Premium room booking
  # ─────────────────────────────────────────────────────────────────────────

  @regression @premium
  Scenario: Book the Suite room for a longer stay
    When I enter check-in date "2026-08-01" and check-out date "2026-08-07"
    And I click Check Availability
    Then I should see the available rooms section
    And the room list should contain "Suite"
    When I click Book Now for "Suite" room
    Then I should be on the Suite room reservation page
    And the price summary should be visible
    When I click Reserve Now
    And I fill in the booking form with the following guest details:
      | firstname | lastname | email               | phone       |
      | David     | Clark    | david.c@test.com    | 07700999000 |
    And I submit the booking
    Then I should see a booking confirmation message
