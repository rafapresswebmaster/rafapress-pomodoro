# Five-member camp roster

Camp supports five living companions. New games create one companion; the Tavern
provides free recruits for the remaining slots. Quests require one to three companions, so your starting companion can embark alone.

Start Quest opens a profile picker with two cards above three cards. Each profile
shows its portrait, class, level, current HP, Armor and Ward. Select one to three, review
the quest, then confirm departure. Cancel leaves the party and timer unchanged.
The risk preview, confirmation and expedition all use the selected party. The
other companions stay at camp and can continue their jobs.

The hub keeps its existing companion cards and adds vertical scrolling. The camp
scene also displays all five companions. Existing saves preserve their members,
equipment and active expeditions, gaining two empty roster slots when applicable.
Schema 29 preserves all five roster slots and the selected mission party.

Validation: `tests/five_member_roster.test.js` covers creation, capacity, party
validation, mission membership, benched companions, risk preview, targeted
blessings and save migration. `tests/five_member_roster_smoke.py` exercises actual
creation, Tavern recruitment, scrolling, profile clicks, cancellation and dispatch
at 816×624 and 1280×720. Screenshots are in `tests/visuals/roster5-*`.
