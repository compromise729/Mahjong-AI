# Mahjong table design QA

final result: passed

Date: 2026-10-13. Implementation: http://127.0.0.1:4173/ . Browser: Codex in-app browser.

## 2026-10-14: initial heavenly Hu and winning tiles beside each hand

- Latest user requirement supersedes older winner-display notes: own remaining faces stay face-up, and every winning face occupies the separated new-draw position. Opponent remaining hands stay hidden. Winning river ledger references remain for physical-count deduplication, but the winning display is no longer duplicated in the visible river.
- Reproduced heavenly Hu being disabled: own initial14 was valid but drawnTile was absent. Initialization now retains the original input14th face before sorting. A valid initial dealer hand offers both the self-draw action and a green天胡 prompt; winning does not draw or reduce the initial55 wall tiles. A normal first-round draw can still Hu and reduces the wall once. Missing-suit and invalid shapes remain rejected.
- Browser own fixture:12345699万、234678条, missing筒, own dealer. Green prompt shows九万/天胡; self-draw action is enabled. Direct天胡 keeps55 wall tiles, shows13 ordinary bright faces plus九万 in the separate winning slot, zero own backs, and no duplicate winning face in own displayed river.
- Browser checked all opponent seats: top initial天胡八万, left point Hu九万, right initial天胡七条. Each retains13 backs and one bright face in its concealed-row new-draw slot. All winning slot faces have opacity1. Top/left/own triple-winner case ends the round; shared point-winning displays still count one physical source tile.
- Own ordinary first recorded draw九万 also shows the green self-draw prompt, remains enabled and produces14 visible faces after Hu. Underlying concealed13 plus winning ledger tile preserve knownCounts. Undo restores the pre-Hu marker/phase and full state.
- Independent review identified sorting losing the designated14th when reopening setup. Added setupHand to preserve drawnTile at the input array's end, or append the winner's winning face. Observed test RED→GREEN; browser reopened and saved unchanged and retained九万/天胡. Winner setup prefill restores all14 known faces.
- Restricted own draw labels to a dedicated class so the non-interactive winning Tile span retains normal layout. Side stacks reserve space for the separated slot. Moved side Hu labels below their faces after reproducing the right Hu label overlapping the own winning tile. Narrow390px DOM check placed the right winning slot inside the table; own hand keeps its horizontal scroller. Viewport override reset.
- Evidence: `qa/heavenly-win-own-face-up.jpg`, `qa/winners-beside-hands.jpg`, `qa/own-and-right-win-slots.jpg`, latest `qa/heavenly-win-final.jpg`. Inspected real screenshots. Console errors/warnings none. Original user tab preserved; tests performed in a temporary tab.
- Final92/92 tests and production build pass. Added6 heavenly/setup tests. Existing blood-battle continuation, reserved winning discard, shared physical counts, all meld phases, wall counts and undo remain covered. 天胡 is recorded as a win category; automatic score settlement remains outside the current UI.

Heavenly Hu and winning-slot follow-up result: passed.

## Follow-up: full hand tops, right seat, round status and self-draw banner

- Reproduced selected own tiles extending3px above the zero-padding horizontal scroller. Added10px top padding; browser measurements show each selected tile now7px below its clipping boundary, leaving space for its outline. Visual check confirms full rounded tops. Right seat moved left16px on desktop (right40px, browser verified),8px in the mobile rule (right12px).
- Finished rounds display“对局结束”centered in the header. Real three-winner fixture produced the label with center delta effectively0px; undo removed it. Narrow headers reserve a second centered status row.
- A legal own winning draw shows the existing green response style with the new drawn face and a direct“自摸胡牌”button. Browser fixture: own1234569万、234678条, missing筒, then九万 draw. Banner shows九万; clicking Hu moves it into own river, hides the banner and leaves13 backs. Undo restores the banner and drawn face. Before draw, non-winning draws and missing-suit draws do not show this banner.
- Evidence: `qa/hand-top-padding-right-seat.jpg`, `qa/round-ended-header.jpg`, `qa/self-draw-green-banner.jpg`. Inspected real screenshots; console errors/warnings none. User's original page was preserved, validation performed in a temporary tab.
- Full86/86 tests and production build pass. New self-draw response tests were observed RED before implementation and GREEN afterwards.

Hand, round-status and self-draw follow-up result: passed.

## Visual follow-up: six bamboo, direct meld buttons and concealed orientation

- Six bamboo corrected from3 rows×2 columns to2 rows×3 columns, three green pieces above and three below. Updated the source generator, source/public SVG, individual PNG and catalog/revision sheets; only six bamboo and the two sheets changed SVG hashes. Generator's27 face-count/glyph checks pass. A versioned six-bamboo image URL refreshes the face in the existing page without discarding its record state.
- Removed the More dropdown. Pung, open kong, added kong and concealed kong are direct buttons using the existing handlers/disabled checks. Browser confirmed eight visible action labels and no type select. Clicking top's direct pung button automatically binds the latest own五筒 with no source/face picker.
- Concealed backs on right and top rotate180° from their former direction: right270° overall, top180°. Computed browser transforms verified right matrix(0,-1,1,0) and top matrix(-1,0,0,-1); left stays90°. The rules target the separated drawn back too and do not affect public melds.
- Evidence: `qa/six-bamboo-actions-orientation.jpg`. Visually inspected the real hand/picker six-bamboo face, four direct meld buttons, and oriented opponent backs. Browser console errors/warnings none. Production build passed. Existing user records were preserved; interaction verification used a temporary demo tab.

Visual follow-up result: passed.

## Follow-up: turn lock, automatic claim faces, missing suit, dealer and wall

- User clarified: after a draw, finish that player's turn before another acts. Pung retains its discard; kong retains replacement draw and discard; self-draw Hu ends its turn. Both table badges and recorder seats lock, and own-hand buttons cannot bypass another player's lock. State rejects cross-player events atomically. Dealer's initial14 also reserves the first discard.
- Browser: 上家 draws, all three other seat controls and13 own tile buttons disable. Its discard unlocks seats and advances to我. Top pung automatically displays上家九万 with no face picker or source selector, locks top for discard. Undo restores the exact current claim and allows confirming it again.
- Browser: point Hu automatically displays the current上家九万; top winning river gets that face and own Hu response remains available for the shared discard. Own 九万 draw followed by the separate自摸 action shows“自己刚摸到的九万” with no picker. Confirmation moves that face into own river and leaves13 hidden tiles; undo restores14, the draw face, the lock and the self-draw entry.
- Missing-suit actions: state rejects missing tiles for pung, all kong types and all Hu modes. Browser checked all nine筒 picker buttons disabled for top's暗杠 and自摸 with missing筒; latest筒 discard disables point Hu/pung/open kong. Existing opponent hidden shape remains manually asserted.
- Response banner: absent when all Hu/pung/open-kong actions unavailable. Browser also tested a pair of九万 with a non-winning remainder: pung-only banner remains visible and Hu/open kong disabled. This matches the user's final clarification; inability to Hu alone does not hide a valid pung.
- Dealer selector offers我、上家、对家、下家. Browser selected上家: its14 concealed backs, first-discard entry, three other disabled seats and55 wall tiles. Selected我 with14 own tiles: first discard and55 wall tiles. Tests cover all four choices and successor seats.
- Wall begins at55 after dealing108 tiles. Explicit draw consumes one; normal opponent discard with an omitted draw consumes one implicitly, never twice; pung and winning claims consume none. Kong consumes at replacement draw. Browser tracked55→54 on top draw, stayed54 at暗杠, reached53 at replacement, stayed53 on discard, reached52 at own draw and stayed52 through Hu/undo. An empty wall rejects further draw. Old hot-reloaded hands without wall data are kept intact and must start through the new setup before wall bookkeeping; invalid counters cannot becomeNaN.
- Independent review identified an Important omitted normal draw before opponent added/concealed kong. Fixed by requiring a recorded draw in state and disabling those menu options until drawn; observed regression test RED→GREEN. Prior fixtures were updated to perform their valid draw/discard phase before testing meld/count errors.
- Evidence: `qa/turn-lock.jpg`, `qa/turn-claims-selfdraw-wall.jpg` (desktop wall status, locked seats, auto self-draw face), `qa/dealer-wall-mobile.jpg` (mobile header/dealer state). Effective narrow viewport468px, document453px, no horizontal overflow. Temporary viewport reset; browser console errors/warnings none. The user's original tab/records were preserved, with verification performed in a separate temporary tab.
- Final84/84 tests pass; production build passes. Scoring, rob-kong and end-of-wall settlement remain outside scope. No deployment performed.

Turn, claim, dealer and wall follow-up result: passed.

## Fix: opponent drawn backs were misplaced

- Reproduced all three opponent draw events. State and counts updated correctly, but `.opponent-draw>span` also positioned the Tile span absolutely. Side draw containers had zero height, with backs moved sideways; the top draw had zero container width and its back moved down.
- Browser regression assertion failed before the fix (absolute-positioned backs and zero-height side containers). Scoped label styling to a dedicated `.opponent-draw-label` class. Afterwards all three backs use relative positioning, occupy nonzero space and have a visible gap after the original stack.
- Verified both the demonstration's meld-adjusted10→11 backs and a new hand's13→14 backs. Each opponent's new back remains visible before selecting its discard. Confirming each opponent discard removes only its separated back; three undos restore all three draws. No horizontal overflow or console errors/warnings.
- Screenshot `qa/opponent-draw-fixed.jpg` shows all three14-tile hands with separated new-draw backs. Delivery crop `qa/opponent-draw-proof.jpg` retains the table and recorder heading. Full64-test suite and production build pass.

Opponent draw display fix result: passed.

## Follow-up: discard responses and every winner's river

User requested live self Hu/pung/open-kong choices and a face-up winning tile in every winner's river. This supersedes earlier hidden fourteen-tile winning-hand displays and the earlier passed-win limitation note.

- Browser fixture: 1144万、114477条、999万 (13 tiles), missing筒; 上家 discards九万. Hu, pung and open kong are all enabled as separate choices. Pass hides the response and selects我/自己摸牌. Undo restores the same response. Direct pung creates three public九万 and11 concealed tiles, selects own discard; undo then direct open kong creates four public九万 and10 concealed tiles, selects replacement draw.
- Browser: direct own Hu creates a face-up九万 with a Hu marker in own river and13 hidden remaining tiles. Top and right point wins on the same discard produce three winning river displays, end the round and disable further seat/action entry. The shared-tile note stays visible after round end.
- Browser: opponent draw followed by self-draw Hu requires selecting the actual winning face; confirmation is disabled beforehand. Recorded下家八万 and verified its correct SVG in the river with13 hidden remaining tiles. Own1234569万、234678条 + 九万 draw pre-fills self-draw Hu, disables other winning faces, places九万 in own river and leaves13 backs. Undo restores14 tiles and the selected winning face.
- Visual check reproduced a zero-height winning river item: the badge CSS selected the tile's outer span as well. A dedicated marker class fixed it; each desktop winning tile now measures40×54px. Public winning tiles retain full opacity while opponent concealed backs fade. Verified real faces and Hu markers in the browser screenshot.
- Final preview at effective645px: response, winning face and all three concealed stacks visible; document has no horizontal overflow. Console error/warning entries: none. Browser viewport override reset. Desktop winning-river inspection used effective1200px.
- Evidence: `qa/responses-and-winning-rivers.jpg` is the final full-page capture with top winner九万 and enabled own Hu response; `qa/responses-and-winning-rivers-proof.jpg` crops it after the response region for delivery. `qa/winning-rivers-raw.jpg` shows the earlier three-winner case; that capture clips the right edge and is supporting evidence only.
- Full suite64/64 passed. Production build passed. New tests cover exact live-discard bindings, stale-response rejection, simultaneous options, shared-discard deduplication, all self-draw winning faces, explicit/implicit passed-win enforcement, continuation and undo. Independent read-only code review found no additional blocking issue after the stale-discard fix; outdated passed-win copy was corrected.
- Scope: own passed winning faces are blocked until next own draw. Unspecified missing-suit meld and passed-win release boundaries remain marked pending; opponent hidden shapes remain manually asserted. Scoring, rob-kong adjudication, wall exhaustion and AI decisions are not claimed.

Response and winning-river follow-up result: passed.

## Follow-up: hidden opponent draws and blood-battle wins

User confirmed2026-10-13: continue from the next non-winner after the furthest anticlockwise winner, including one-discard multiple wins. Implemented both self-draw and discard win recording. This supersedes earlier notes deferring win recording and blood-battle continuation.

- Browser: opponent draw requires no face, adds one separated back (13→14 without melds,10→11 with one meld), confirmed discard removes it and returns the resting count. No hidden tile identity recorded.
- Browser: used1234569万、234678条, missing筒; left discards九万. Recorded top win before own win to deliberately reverse seat order. Both times auto-selection goes to上家, the next non-winner after the furthest anticlockwise winner对家. Own point win passes real structure validation and turns own14 tiles to backs.
- Browser: third simultaneous winner下家 ends the round; seat controls and confirmation disable. Undo restores下家 and its point-win mode/source. Undo a new hand setup restores the two-winner state with an active上家 selected.
- Browser: own and top winner seats disabled; remaining left draw still produces a separated back and self-draw win option. At effective390px mobile width, separated draw remains inside table and above own hand; document width377px. Console error/warn entries: none.
- Evidence: `qa/blood-battle-raw.jpg`, normalized `qa/blood-battle.png`. Shows two exited winners, hidden own winning hand, active left14-tile hand with separated draw, and self-draw recording controls.
- Independent read-only review found one Important issue: an already-winning opponent discard could be reused in a later meld. Fixed with observed RED→GREEN test; exact winning discard reserved, later distinct copies still usable. Minor setup-undo selection finding also corrected and browser-verified.
- Final suite51/51 passes, production build passes. Tests cover unknown draws, atomic failures, discarded draw removal, structure validation, one-discard triple wins, physical count deduplication, frozen winners, won source rejection, winner-skipping, seat-order continuation, three-win termination, undo/reset, reserved winning tiles and distinct later copies.
- Scope: opponent full hidden shape is manually asserted by the user; scoring, passed-win/rob-kong adjudication and wall exhaustion are not claimed.

Blood-battle follow-up result: passed.

## Follow-up: automatic entry flow, hand sorting and waiting tiles

User requested these changes on2026-10-13; they supersede the initial prototype's lack of rule-based hand analysis.

- Reproduced the layout cause: a fixed-height side tile stack can exceed the540px table at smaller desktop heights. Tile sizing now adapts to the concealed count and fits within390px. Opponents without melds show all13 backs plus an explicit count; meld-adjusted counts remain based on the state model.
- Browser fixture: own hand1234569万、234678条, missing筒. Waiting panel correctly shows九万 and3 unseen copies.
- Tested 上家 discard→我/自己摸牌; own draw→出牌; choose九条→preview “打出九条后可听九万”; own discard→下家; 下家 discard→对家; 对家 discard→上家. Undo restores对家/出牌 after undoing its event.
- Browser inspected own hand labels after discard: 一二三四五六九万, 二三四六七八条, in requested order.
- At desktop request1440×960 both side stacks have13 tiles and every tile image lies inside the table. At effective390px mobile width, document width377px; both13-tile stacks end before own hand starts.
- Visible dropdown options are only碰牌、明杠、补杠、暗杠; hidden neutral placeholder“更多”is excluded from the open menu.
- Screenshot `qa/waits-and-flow-raw.jpg` captures the real browser fixture, including all13 side backs, sorted own hand and九万 waiting tile. Console errors/warnings: none.
- Final production build succeeded; full test suite34/34 passed. New tests cover ordinary waits, two-sided waits, seven/dragon seven pairs, golden hook, missing-suit rejection, three-suit rejection, no fifth physical copy, meld-adjusted size, discard previews, exhausted visible waits, invalid totals, automatic seat/action flow and sorting.
- Rule-based waiting analysis is now implemented; AI ranking, probability estimates and scoring remain outside scope. The earlier baseline section below records the initial19-test acceptance.

Follow-up result: passed.

## Visual truth and evidence

- Source: `../docs/superpowers/specs/assets/warm-table-selected.png`, 1487×1058 pixels.
- Tile truth: `../assets/tiles/tile-corrections-v3.png`, approved SVGs in `public/tiles/`, plus the written specification. The generated mock's inaccurate faces and fake recommendation are deliberately replaced.
- Implementation: `qa/desktop-final-raw.jpg`; normalized `qa/desktop-final.png`.
- Full comparison: `qa/comparison-final.png`, source left, implementation right, each normalized to 1440×1024.
- Focused comparison: `qa/comparison-detail.png`, hand and event-entry regions together, source left and implementation right.
- Responsive evidence: `qa/mobile-final-raw.jpg`; hand setup: `qa/setup-mobile-raw.jpg`.

Desktop capture requested 1440×1024. Windows browser reports DPR 1.20000008 and effective DOM viewport 1200×853. The screenshot API returns a 1440×1045 canvas with a 1200×853 page region and blank extension. Crop only the blank extension and proportionally normalize the page to 1440×1024; source is normalized to the same dimensions. This is a visual comparison with density normalization, not a claim of exact CSS pixel equality. Narrow-screen request 468×1013, effective DOM 390×844; raw capture includes the full scrollable page and blank extension. No browser chrome is compared.

State: initial explicitly marked demo, 下家 selected, discard 七万 preview, own 14 tiles with separated newly drawn 五筒, opponents each ten concealed backs after one meld. Source mock uses a different illustrative hand; dynamic tile content and totals are judged against approved assets and state invariants, not its erroneous illustrated counts.

## Comparison history

1. `qa/comparison-first.png`: P2 — opponents' tiles and seat labels were too small; own hand lacked the intended prominence. Picker tiles had overly wide spacing. Header/table proportions differed.
   Fix: increase top backs 34→47px, public tiles 30/34→40px, own hand up to70px; restore light seat names and colored missing-suit pills; limit picker to480px; header68→56px; tune table height.
2. `qa/mobile-raw.jpg`: P2 — side backs and their labels collided with the own-hand region.
   Fix: move side seats upward and separate their labels, reduce mobile backs to34×25px; bound discard regions with scrolling. Final `qa/mobile-final-raw.jpg` shows clear separation. At effective390px, measured side backs bottom430.32px < own hand top506.97px; document width377px ≤ viewport390px.
3. Reopened combined `qa/comparison-final.png` and `qa/comparison-detail.png`, and final mobile image. No remaining actionable P0/P1/P2 finding in the scoped manual-recording experience.

## Required fidelity surfaces

- Typography: real Chinese strings, SimSun/Songti display headings and Microsoft YaHei/PingFang UI text. Traditional 萬 and numerals are outlined real glyphs inside the approved assets; no generated Chinese. Heading hierarchy, small labels and wrapping checked.
- Spacing/layout: warm header, green four-seat table, bottom white event dock retained. Own hand is dominant and the new draw separated. Source separates seat/type columns; implementation groups them to support additional meld/source controls. This is an intentional functional adaptation from the confirmed spec. Hand setup and narrow layout can scroll without hiding core controls.
- Colors/tokens: warm-white surfaces, sage felt, green selection/confirmation, semantic missing-suit pills. Raster felt is present and opaque, with no placeholder artwork. Texture is somewhat more visible than the mock; optional aesthetic refinement only.
- Image quality: all27 faces use one fixed ID mapping in hand, rivers, melds, picker and preview. Correct seven/eight/nine bamboo and dot layouts come from approved assets. Three opponents' hands use only backs. Concealed kong checked as exactly one face + three backs. User instruction expressly authorizes original vector tile drawing.
- Copy/content: coherent manually authored Chinese. Demo labelled; current AI status clearly unavailable. No fake win probabilities, scores, recommendation or wall count. Rule summary and full-document download work.
- Icons: Phosphor icons used consistently for rules/settings, undo, setup, recent events, confirmation and analysis status; no drawn icon substitutes.

## Primary interactions tested in browser

1. Open hand setup, remove one existing tile, choose13 instead of14, change missing suit, save; board resets and opponent concealed count becomes13.
2. Select own 五筒 draw, confirm: hand14 and one separated new-draw marker.
3. Click own 五筒, confirm discard: hand13, own river gains one, new marker clears.
4. Record 上家九万 discard; choose 对家碰牌, source 上家: river tile consumed, three-face meld, opponent concealed count10.
5. Upgrade that pung to 补杠: four faces; undo restores the three-tile pung.
6. Record fourth known 九万, then attempt a fifth: Chinese error, river remains unchanged.
7. Read rules, inspect downloadable `/rules.md`, Escape closes dialog and focus returns.
8. Narrow layout: confirm initial 下家七万 discard and undo; selection, confirm, setup and modal controls accessible by vertical scroll; own hand horizontally scrollable.
9. Final console check: no error or warning entries. No browser runtime exception in application code.

## State and packaging verification

- `pnpm run build`: passed, Vite6.4.2. Emits `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`.
- `pnpm test`:19/19 passed. Covers full undo, atomic failures, hidden information, fifth tile, meld source transfer, all three valid self kong→replacement draw→discard sequences, wrong-phase meld rejection and Worker packaging.
- Fresh-context independent code review: one Important self-meld phase issue fixed with observed RED→GREEN tests. No Critical findings.

## Follow-up polish and boundaries

- P3: rules dialog could directly list unresolved scoring boundaries; currently the full rule document contains them and is downloadable.
- A complete turn engine, missing-suit action restrictions, win adjudication, scoring, AI decisions and reload persistence are subsequent work explicitly outside this prototype. The interface does not claim those features.
- No production deployment or sharing performed. Local preview remains running and the browser tab is marked as a deliverable.
