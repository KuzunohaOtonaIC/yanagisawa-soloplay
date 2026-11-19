/*
 * 画面の文言の対応表（日本語 / 英語）
 *
 * ・「英語のみ（業務用）」を選ぶと英語（en）、それ以外は日本語（ja）で表示します。
 * ・文言を直すときは、このファイルの ja: / en: の '…' の中だけを書き換えてください。
 * ・{name} のような {…} の部分には、カード名や枚数などが入ります。消さずに残してください。
 * ・en が空や未記入のときは、日本語が表示されます。
 */
(function (root) {
  'use strict';

  const I18N = {
    // ---------- アプリ全体 ----------
    'app.title': { ja: '柳澤流ソロプレイツール', en: 'Yanagisawa Solo Play Tool' },
    'app.subtitle': { ja: 'MTG 一人回し', en: 'MTG goldfishing' },
    'app.disclaimer1': { ja: '本アプリは非公式のファンコンテンツです。Wizards of the Coast の承認・後援を受けたものではありません。', en: 'This app is unofficial Fan Content. It is not approved or endorsed by Wizards of the Coast.' },
    'app.disclaimer2a': { ja: 'カード情報・画像は', en: 'Card data and images are provided by' },
    'app.disclaimer2b': { ja: 'より取得しています。', en: '.' },

    // ---------- デッキを読み込む ----------
    'editor.title': { ja: 'デッキを読み込む', en: 'Load a deck' },
    'editor.file': { ja: 'txtファイルから読み込む', en: 'Load from .txt file' },
    'editor.fileHint': { ja: 'ファイル名がデッキ名になります。ここにドラッグ＆ドロップしてもOK（複数可）', en: 'The file name becomes the deck name. You can also drag and drop files here (multiple OK).' },
    'editor.or': { ja: 'または貼り付け', en: 'or paste' },
    'editor.deckName': { ja: 'デッキ名', en: 'Deck name' },
    'editor.deckNamePh': { ja: '例: Mono Red Prison', en: 'e.g. Mono Red Prison' },
    'editor.deckList': { ja: 'デッキリスト（MTGO形式）', en: 'Deck list (MTGO format)' },
    'editor.expand': { ja: '広げる ▼', en: 'Expand ▼' },
    'editor.collapse': { ja: 'たたむ ▲', en: 'Collapse ▲' },
    'editor.save': { ja: '読み込んで保存', en: 'Load and save' },
    'editor.clear': { ja: 'クリア', en: 'Clear' },
    'editor.confirmOverwrite': { ja: '「{name}」はすでに保存されています。上書きしますか？', en: '"{name}" already exists. Overwrite it?' },
    'editor.saved': { ja: '「{name}」を保存しました（メイン {main}枚 / サイド {side}枚）。', en: 'Saved "{name}" (main {main} / side {side}).' },
    'editor.parseLine': { ja: '{line}行目: {text}', en: 'Line {line}: {text}' },
    'editor.needName': { ja: 'デッキ名を入力してください。', en: 'Please enter a deck name.' },
    'editor.noCards': { ja: 'メインデッキのカードが読み取れませんでした。「4 Ancient Tomb」の形式で入力してください。', en: 'No main deck cards could be read. Use the format "4 Ancient Tomb".' },
    'editor.ignoredLines': { ja: ' 次の行は読み取れなかったため無視しました:', en: ' These lines could not be read and were ignored:' },
    'editor.chooseTxt': { ja: 'txt ファイルを選んでください。', en: 'Please choose a .txt file.' },
    'editor.fileUnreadable': { ja: '{file}: 読み込めませんでした', en: '{file}: could not be read' },
    'editor.fileNoCards': { ja: '{file}: カードが読み取れませんでした', en: '{file}: no cards could be read' },
    'editor.ignored': { ja: '（無視しました）', en: ' (ignored)' },
    'editor.nothingSaved': { ja: '保存できたデッキはありません。', en: 'No decks were saved.' },

    // ---------- デッキ一覧 ----------
    'decks.title': { ja: 'デッキ一覧', en: 'Decks' },
    'decks.imageMode': { ja: 'カード画像', en: 'Card images' },
    'decks.imageJa': { ja: '表示する（日本語版を優先）', en: 'Show (Japanese first)' },
    'decks.imageEn': { ja: '表示する（英語版）', en: 'Show (English)' },
    'decks.imageWork': { ja: '英語のみ（業務用）', en: 'English only (work mode)' },
    'decks.start': { ja: '開始', en: 'Start' },
    'decks.edit': { ja: '編集', en: 'Edit' },
    'decks.delete': { ja: '削除', en: 'Delete' },
    'decks.sort': { ja: '並び順', en: 'Sort' },
    'decks.sortType': { ja: 'カード種類', en: 'Card type' },
    'decks.sortJa': { ja: '日本語名', en: 'Japanese name' },
    'decks.sortEn': { ja: '英語名', en: 'English name' },
    'decks.option': { ja: '{name}（{n}枚）', en: '{name} ({n})' },
    'decks.groupPreset': { ja: '組み込みデッキ', en: 'Built-in decks' },
    'decks.groupSaved': { ja: '保存したデッキ', en: 'Saved decks' },
    'decks.none': { ja: '（まだありません）', en: '(none yet)' },
    'decks.empty': { ja: '左の欄からデッキを読み込んで保存してください。', en: 'Load and save a deck using the panel on the left.' },
    'decks.presetNote': { ja: '組み込みデッキです。「編集」で読み込むと、手を加えて自分のデッキとして保存できます。', en: 'This is a built-in deck. Use "Edit" to load it, change it and save it as your own deck.' },
    'decks.main': { ja: 'メインデッキ', en: 'Main deck' },
    'decks.side': { ja: 'サイドボード', en: 'Sideboard' },
    'decks.cannotDeletePreset': { ja: '組み込みデッキは削除できません', en: 'Built-in decks cannot be deleted' },
    'decks.confirmDelete': { ja: '「{name}」を削除しますか？', en: 'Delete "{name}"?' },
    'decks.diagnose': { ja: 'Scryfall 接続チェック', en: 'Check Scryfall connection' },
    'decks.clearCache': { ja: 'カード情報のキャッシュを削除', en: 'Clear card data cache' },
    'decks.confirmClearCache': { ja: 'Scryfall から取得したカード情報のキャッシュを削除して、取得し直しますか？', en: 'Clear the card data downloaded from Scryfall and download it again?' },

    // ---------- カード情報の取得 ----------
    'fetch.failed': { ja: 'カード情報を取得できませんでした（{error}）。英語名で表示しています。 ', en: 'Could not get card data ({error}). Showing English names. ' },
    'fetch.retry': { ja: '再試行', en: 'Retry' },
    'fetch.diagnose': { ja: '原因を調べる（接続チェック）', en: 'Find the cause (connection check)' },
    'fetch.phaseJa': { ja: '日本語名', en: 'Japanese names' },
    'fetch.phaseType': { ja: 'カード種類', en: 'card types' },
    'fetch.loading': { ja: 'Scryfall から{label}を取得中…{progress}', en: 'Getting {label} from Scryfall…{progress}' },
    'fetch.waiting': { ja: '（接続できなかったため、{sec}秒待って再試行しています。Scryfall の回数制限の可能性があります）', en: ' (Could not connect. Retrying in {sec} seconds. Scryfall may be rate limiting.)' },
    'fetch.notFound': { ja: 'Scryfall で見つからなかったカード: {names}（カード名の綴りを確認してください）', en: 'Cards not found on Scryfall: {names} (please check the spelling)' },
    'err.network': { ja: 'Scryfall に接続できません（{detail}）', en: 'Cannot connect to Scryfall ({detail})' },
    'err.timeout': { ja: 'Scryfall から応答がありません（{sec}秒）', en: 'No response from Scryfall ({sec} s)' },
    'err.http': { ja: 'Scryfall エラー ({status}){detail}', en: 'Scryfall error ({status}){detail}' },

    // ---------- 接続チェック ----------
    'diag.checking': { ja: '接続を確認しています…（最大1分ほど）', en: 'Checking the connection… (up to about 1 minute)' },
    'diag.title': { ja: '接続チェックの結果', en: 'Connection check results' },
    'diag.label.get': { ja: 'Scryfall API に接続（カード1枚の取得）', en: 'Connect to the Scryfall API (get one card)' },
    'diag.label.post': { ja: 'まとめて取得（カード種類用）', en: 'Get cards in bulk (for card types)' },
    'diag.label.ja': { ja: '日本語名の検索', en: 'Search Japanese names' },
    'diag.label.image': { ja: 'カード画像の読み込み（cards.scryfall.io）', en: 'Load card images (cards.scryfall.io)' },
    'diag.ok': { ja: '取得できました', en: 'OK' },
    'diag.okValue': { ja: '取得できました（{value}）', en: 'OK ({value})' },
    'diag.okImage': { ja: '読み込めました', en: 'Loaded' },
    'diag.unexpected': { ja: '想定外の応答です', en: 'Unexpected response' },
    'diag.noJa': { ja: '日本語名が見つかりませんでした', en: 'No Japanese name found' },
    'diag.noApi': { ja: 'API に接続できないため、画像のアドレスが分かりません', en: 'The image address is unknown because the API cannot be reached' },
    'diag.imgTimeout': { ja: '応答がありません（15秒）', en: 'No response (15 s)' },
    'diag.imgError': { ja: '読み込めませんでした', en: 'Could not be loaded' },
    'diag.adviceBlocked1': { ja: 'Scryfall（api.scryfall.com）に接続できません。次のどれかが考えられます。', en: 'Cannot connect to Scryfall (api.scryfall.com). Possible causes:' },
    'diag.adviceBlocked2': { ja: '・会社や学校などのネットワークで、このサイトへの接続が制限されている', en: '- Your network (work, school, etc.) blocks this site' },
    'diag.adviceBlocked3': { ja: '・パソコンの日付・時刻が実際とずれている（ずれていると暗号化通信の確認に失敗します）', en: "- Your computer's date or time is wrong (secure connections then fail)" },
    'diag.adviceBlocked4': { ja: '・セキュリティソフトやブラウザの拡張機能が通信を止めている', en: '- Security software or a browser extension is blocking the connection' },
    'diag.adviceBlocked5': { ja: '別のネットワーク（スマホのテザリングなど）で試すと、ネットワークが原因かどうか切り分けられます。', en: 'Trying another network (e.g. phone tethering) shows whether the network is the cause.' },
    'diag.adviceBlocked6': { ja: 'このアプリはカード情報なしでも英語名で動きます。', en: 'The app still works with English names without card data.' },
    'diag.adviceImage1': { ja: 'カード情報は取得できますが、画像のサーバー（cards.scryfall.io）に接続できません。', en: 'Card data can be downloaded, but the image server (cards.scryfall.io) cannot be reached.' },
    'diag.adviceImage2': { ja: 'ネットワークの制限が考えられます。画像なしでも文字表示で使えます。', en: 'Your network may be restricting it. The app also works without images.' },
    'diag.advicePost': { ja: '一部の取得方法が使えない環境ですが、自動で別の方法に切り替えて取得します。「再試行」を押してください。', en: 'One download method is unavailable, so another one is used automatically. Press "Retry".' },
    'diag.adviceOk': { ja: '接続は正常です。「カード情報のキャッシュを削除」を押すと取得し直します。', en: 'The connection is fine. Press "Clear card data cache" to download again.' },
    'diag.env': { ja: 'ブラウザ情報: {ua}／開き方: {protocol}／パソコンの時刻: {time}', en: 'Browser: {ua} / Opened via: {protocol} / Computer time: {time}' },

    // ---------- カードの種類 ----------
    'type.creature': { ja: 'クリーチャー', en: 'Creature' },
    'type.planeswalker': { ja: 'プレインズウォーカー', en: 'Planeswalker' },
    'type.battle': { ja: 'バトル', en: 'Battle' },
    'type.instant': { ja: 'インスタント', en: 'Instant' },
    'type.sorcery': { ja: 'ソーサリー', en: 'Sorcery' },
    'type.artifact': { ja: 'アーティファクト', en: 'Artifact' },
    'type.enchantment': { ja: 'エンチャント', en: 'Enchantment' },
    'type.land': { ja: '土地', en: 'Land' },
    'type.other': { ja: 'その他', en: 'Other' },
    'type.unknown': { ja: '種類不明', en: 'Unknown type' },

    // ---------- 一人回し画面：ツールバー ----------
    'game.back': { ja: '← デッキ選択へ戻る', en: '← Back to decks' },
    'game.turn': { ja: 'ターン', en: 'Turn' },
    'game.undo': { ja: '↶ 元に戻す', en: '↶ Undo' },
    'game.undoTitle': { ja: '直前の操作を取り消します（Z キー / Ctrl+Z）', en: 'Undo the last action (Z key / Ctrl+Z)' },
    'game.nextTurn': { ja: '次のターンへ（アンタップ＋1枚引く）', en: 'Next turn (untap + draw 1)' },
    'game.nextTurnTitle': { ja: '場のカードをアンタップし、ターン数を1増やして1枚引きます', en: 'Untap your permanents, add 1 to the turn count and draw a card' },
    'game.nextGame': { ja: '次のゲーム ▾', en: 'Next game ▾' },
    'game.nextGameTitle': { ja: '次のゲーム', en: 'Next game' },
    'game.nextStart': { ja: '現在の構成を引き継いで開始', en: 'Start with the current deck' },
    'game.nextStartTitle': { ja: 'サイドボーディング画面を通さず、今の構成のまますぐ始めます', en: 'Start right away with the current deck, skipping sideboarding' },
    'game.nextStartNote': { ja: '(今はメインのまま)', en: '(no changes from the main deck)' },
    'game.nextAdjust': { ja: 'サイドボード調整', en: 'Adjust sideboard' },
    'game.nextAdjustTitle': { ja: '今の構成のまま、サイドボーディング画面へ進みます', en: 'Go to sideboarding with the current deck' },
    'game.nextReset': { ja: 'メインに戻す', en: 'Reset to main deck' },
    'game.nextResetTitle': { ja: '元のリストに戻してから、サイドボーディング画面へ進みます', en: 'Reset to the original list, then go to sideboarding' },
    'game.number': { ja: '第{n}ゲーム', en: 'Game {n}' },
    'game.started': { ja: '第{n}ゲームを開始しました', en: 'Game {n} started' },

    // ---------- 一人回し画面：手札・場・墓地・追放・ライブラリー ----------
    'zone.hand': { ja: '手札', en: 'Hand' },
    'zone.battlefield': { ja: '場', en: 'Battlefield' },
    'zone.graveyard': { ja: '墓地', en: 'Graveyard' },
    'zone.exile': { ja: '追放', en: 'Exile' },
    'zone.library': { ja: 'ライブラリー', en: 'Library' },
    'zone.none': { ja: '（なし）', en: '(none)' },
    'hand.hintPlay': { ja: 'クリックで場に出す。下のボタンでライブラリーの一番上／一番下へ', en: 'Click to play. Use the buttons below to put a card on top / bottom of the library.' },
    'hand.hintBottom': { ja: 'クリックでライブラリーの下に置くカードを選ぶ（もう一度クリックで選択解除）', en: 'Click to choose cards to put on the bottom of the library (click again to unselect)' },
    'hand.hintLocked': { ja: 'キープするまで操作できません', en: 'Keep your hand first' },
    'hand.clickPlay': { ja: '場に出す', en: 'play it' },
    'hand.clickBottom': { ja: 'ライブラリーの下に置くカードとして選ぶ', en: 'choose it for the bottom of the library' },
    'hand.clickTo': { ja: '（クリックで{what}）', en: '(click to {what})' },
    'hand.bottomBadge': { ja: '下へ {n}', en: 'Bottom {n}' },
    'battlefield.hint': { ja: 'クリックでタップ／アンタップ、ドラッグ（スマホは長押し）で並べ替え、右クリックでカウンター（右半分＋1／左半分−1）', en: 'Click to tap / untap, drag (long-press on phones) to reorder, right-click for counters (right half +1 / left half -1)' },
    'battlefield.counterHint': { ja: '右クリック：右半分でカウンター＋1、左半分で−1', en: 'Right-click: right half adds a counter, left half removes one' },
    'battlefield.counters': { ja: 'カウンター {n}個', en: '{n} counter(s)' },
    'battlefield.empty': { ja: '（手札のカードをクリックすると、ここに出ます）', en: '(Click a card in your hand to play it here)' },
    'battlefield.clickTap': { ja: '（クリックでタップ）', en: '(click to tap)' },
    'battlefield.clickUntap': { ja: '（クリックでアンタップ）', en: '(click to untap)' },
    'pile.hint': { ja: 'ボタンで手札・場・ライブラリーへ', en: 'Use the buttons to move cards to hand, battlefield or library' },
    'library.hint': { ja: '上から順に表示。カード名のクリックで手札に加えてシャッフル。「上へ」「下へ」で一番上／一番下に移動', en: 'Shown from the top. Click a card name to put it into your hand and shuffle. "Top" / "Bottom" moves a card to the top / bottom.' },
    'library.tutor': { ja: '手札に加えてシャッフル', en: 'Put into hand and shuffle' },
    'draw.label': { ja: 'ドロー', en: 'Draw' },
    'draw.key': { ja: 'D キー', en: 'D key' },
    'draw.title': { ja: 'ライブラリーの一番上を1枚引きます（D キーでも引けます）', en: 'Draw the top card of the library (or press D)' },
    'draw.left': { ja: '残り {n} 枚', en: '{n} left' },
    'draw.empty': { ja: 'ライブラリーなし', en: 'Library empty' },
    'move.top': { ja: '上へ', en: 'Top' },
    'move.topTitle': { ja: 'ライブラリーの一番上に置く', en: 'Put on top of the library' },
    'move.bottom': { ja: '下へ', en: 'Bottom' },
    'move.bottomTitle': { ja: 'ライブラリーの一番下に置く', en: 'Put on the bottom of the library' },
    'move.graveyard': { ja: '墓地', en: 'GY' },
    'move.graveyardTitle': { ja: '墓地へ置く', en: 'Put into the graveyard' },
    'move.hand': { ja: '手札', en: 'Hand' },
    'move.handReturnTitle': { ja: '手札に戻す', en: 'Return to hand' },
    'move.handTitle': { ja: '手札に加える', en: 'Put into hand' },
    'move.exile': { ja: '追放', en: 'Exile' },
    'move.exileTitle': { ja: '追放する', en: 'Exile it' },
    'move.battlefield': { ja: '場', en: 'Play' },
    'move.battlefieldTitle': { ja: '場に出す', en: 'Put onto the battlefield' },
    'moved.hand': { ja: '{name} を手札に加えました', en: 'Put {name} into your hand' },
    'moved.battlefield': { ja: '{name} を場に出しました', en: 'Put {name} onto the battlefield' },
    'moved.graveyard': { ja: '{name} を墓地に置きました', en: 'Put {name} into the graveyard' },
    'moved.exile': { ja: '{name} を追放しました', en: 'Exiled {name}' },
    'moved.top': { ja: '{name} をライブラリーの一番上に置きました', en: 'Put {name} on top of the library' },
    'moved.bottom': { ja: '{name} をライブラリーの一番下に置きました', en: 'Put {name} on the bottom of the library' },
    'moved.fromSide': { ja: '{name} をサイドボードから手札に加えました', en: 'Put {name} from your sideboard into your hand' },
    'toast.undo': { ja: '元に戻しました', en: 'Undone' },
    'toast.needBottom': { ja: '先にライブラリーの下に置くカードを選んで「決定」を押してください', en: 'First choose the cards for the bottom of the library and press "Confirm"' },
    'toast.needKeep': { ja: '「キープ」を押してから操作してください', en: 'Press "Keep" first' },
    'toast.libraryEmpty': { ja: 'ライブラリーにカードがありません', en: 'Your library is empty' },
    'toast.drew': { ja: '{name} を引きました', en: 'Drew {name}' },
    'toast.nextTurnDrew': { ja: 'ターン{turn}：アンタップして {name} を引きました', en: 'Turn {turn}: untapped and drew {name}' },
    'toast.nextTurnEmpty': { ja: 'ターン{turn}：ライブラリーにカードがありません', en: 'Turn {turn}: your library is empty' },
    'toast.mulliganed': { ja: 'マリガンしました（{n}回目）', en: 'Mulliganed (mulligan {n})' },
    'toast.bottomDone': { ja: '{n}枚をライブラリーの下に置きました。プレイを始めてください', en: 'Put {n} card(s) on the bottom of the library. You can start playing.' },
    'toast.bottomMax': { ja: '選べるのは {n} 枚までです', en: 'You can choose up to {n} card(s)' },
    'toast.tutored': { ja: '{name} を手札に加え、ライブラリーをシャッフルしました', en: 'Put {name} into your hand and shuffled the library' },

    // ---------- マリガン ----------
    'mull.keep': { ja: 'キープ', en: 'Keep' },
    'mull.confirm': { ja: '決定', en: 'Confirm' },
    'mull.mulligan': { ja: 'マリガン', en: 'Mulligan' },
    'mull.again': { ja: 'もう一度マリガン', en: 'Mulligan again' },
    'mull.opening': { ja: '初手です。マリガンしない場合は、そのままプレイを始めてください（キープ扱いになります）。', en: 'This is your opening hand. If you keep it, just start playing (that counts as a keep).' },
    'mull.after': { ja: 'マリガン {m} 回目の手札です。キープすると、手札から {n} 枚をライブラリーの下に置きます。', en: 'Hand after mulligan {m}. If you keep it, you put {n} card(s) from your hand on the bottom of the library.' },
    'mull.choose': { ja: 'ライブラリーの一番下に置くカードを手札から {n} 枚選んでください（{selected} / {n}）。選んだ順に下へ置きます。', en: 'Choose {n} card(s) from your hand to put on the bottom of the library ({selected} / {n}). They go to the bottom in the order you choose.' },
    'mull.confirmN': { ja: '決定（{n}枚を下へ）', en: 'Confirm ({n} to bottom)' },

    // ---------- サイドボーディング ----------
    'sb.title': { ja: 'サイドボーディング', en: 'Sideboarding' },
    'sb.countMain': { ja: 'メイン', en: 'Main' },
    'sb.countSide': { ja: 'サイド', en: 'Side' },
    'sb.countUnit': { ja: '枚', en: 'cards' },
    'sb.countSep': { ja: '／', en: '/' },
    'sb.hint': { ja: 'メインのカードをクリックでサイドへ、サイドのカードをクリックでメインへ（1枚ずつ）。入れ替えは1対1でなくてもかまいません。', en: 'Click a main deck card to move it to the sideboard, or a sideboard card to move it to the main deck (one at a time). Swaps do not have to be one-for-one.' },
    'sb.start': { ja: 'ゲーム開始', en: 'Start game' },
    'sb.startSub': { ja: 'シャッフルして7枚引く', en: 'Shuffle and draw 7' },
    'sb.mainTitle': { ja: 'メインデッキ', en: 'Main deck' },
    'sb.toSide': { ja: 'クリックでサイドへ', en: 'Click to move to sideboard' },
    'sb.toMain': { ja: 'クリックでメインへ', en: 'Click to move to main deck' },
    'sb.toHand': { ja: 'クリックで手札に加える（ゲーム中の入れ替えは「次のゲーム」から）', en: 'Click to put into your hand (to swap cards, use "Next game")' },
    'sb.emptyMain': { ja: '（メインにカードがありません）', en: '(no cards in the main deck)' },
    'sb.emptySide': { ja: '（サイドボードはありません）', en: '(no sideboard)' },
    'sb.noDiff': { ja: '元のリストのままです（入れ替えなし）', en: 'Same as the original list (no swaps)' },
    'sb.in': { ja: 'IN（{n}枚）', en: 'IN ({n})' },
    'sb.out': { ja: 'OUT（{n}枚）', en: 'OUT ({n})' },
    'sb.listSep': { ja: '、', en: ', ' },
    'sb.counts': { ja: 'メイン {main} 枚 ／ サイド {side} 枚', en: 'Main {main} / Side {side}' },
    'sb.sideTitle': { ja: 'サイドボード', en: 'Sideboard' },
    'sb.collapse': { ja: 'たたむ ▲', en: 'Collapse ▲' },
    'sb.expand': { ja: 'ひらく ▼', en: 'Expand ▼' },
    'sb.problem.mainShort': { ja: 'メインが{main}枚です。60枚以上にしてください（あと{n}枚）。', en: 'The main deck has {main} cards. It needs at least 60 ({n} more).' },
    'sb.problem.sideOver': { ja: 'サイドが{side}枚です。15枚以下にしてください（{n}枚多い）。', en: 'The sideboard has {side} cards. It can have at most 15 ({n} too many).' },

    // ---------- サイドプラン ----------
    'plan.label': { ja: 'サイドプラン', en: 'Side plan' },
    'plan.save': { ja: '保存…', en: 'Save…' },
    'plan.saveTitle': { ja: '今の入れ替えを、名前を付けてプランとして保存します', en: 'Save the current swaps as a named plan' },
    'plan.saveNeedSwap': { ja: 'カードを入れ替えてから保存してください', en: 'Swap some cards before saving' },
    'plan.saveNeedRules': { ja: '枚数のルールを満たしてから保存してください', en: 'Fix the card counts before saving' },
    'plan.delete': { ja: '削除', en: 'Delete' },
    'plan.export': { ja: 'JSON書き出し', en: 'Export JSON' },
    'plan.exportTitle': { ja: 'このデッキのサイドプランを JSON ファイルに書き出します', en: "Export this deck's side plans to a JSON file" },
    'plan.import': { ja: 'JSON読み込み', en: 'Import JSON' },
    'plan.importTitle': { ja: '書き出した JSON ファイルからサイドプランを読み込みます', en: 'Import side plans from an exported JSON file' },
    'plan.namePh': { ja: 'プラン名（例: vsホガーク）', en: 'Plan name (e.g. vs Hogaak)' },
    'plan.saveSubmit': { ja: 'この入れ替えを保存', en: 'Save these swaps' },
    'plan.cancel': { ja: 'キャンセル', en: 'Cancel' },
    'plan.original': { ja: '（元のリスト）', en: '(original list)' },
    'plan.custom': { ja: '（カスタム：手で入れ替え中）', en: '(custom: swapped by hand)' },
    'plan.groupBuiltin': { ja: '組み込みプラン', en: 'Built-in plans' },
    'plan.groupSaved': { ja: '保存したプラン', en: 'Saved plans' },
    'plan.none': { ja: '（まだありません）', en: '(none yet)' },
    'plan.cannotDeleteBuiltin': { ja: '組み込みプランは削除できません', en: 'Built-in plans cannot be deleted' },
    'plan.reset': { ja: '元のリストに戻しました。', en: 'Reset to the original list.' },
    'plan.notInSide': { ja: 'サイドにない', en: 'not in sideboard' },
    'plan.notInMain': { ja: 'メインにない', en: 'not in main deck' },
    'plan.skippedItem': { ja: '{name} ×{n}（{why}）', en: '{name} x{n} ({why})' },
    'plan.appliedSkipped': { ja: '「{name}」を反映しました。ただし次のカードはデッキリストに見つからず、動かせませんでした：{list}', en: 'Applied "{name}", but these cards were not found in the deck list and could not be moved: {list}' },
    'plan.applied': { ja: '「{name}」を反映しました。', en: 'Applied "{name}".' },
    'plan.needName': { ja: 'プラン名を入力してください。', en: 'Please enter a plan name.' },
    'plan.builtinName': { ja: '「{name}」は組み込みプランと同じ名前なので使えません。', en: '"{name}" is the name of a built-in plan, so it cannot be used.' },
    'plan.confirmOverwrite': { ja: '「{name}」はすでに保存されています。上書きしますか？', en: '"{name}" already exists. Overwrite it?' },
    'plan.saved': { ja: '「{name}」を保存しました。次からは選ぶだけで、この入れ替えが反映されます。', en: 'Saved "{name}". Next time, just choose it to apply these swaps.' },
    'plan.confirmDelete': { ja: 'サイドプラン「{name}」を削除しますか？（今の入れ替えはそのままです）', en: 'Delete side plan "{name}"? (The current swaps stay as they are.)' },
    'plan.deleted': { ja: '「{name}」を削除しました。', en: 'Deleted "{name}".' },
    'plan.fileName': { ja: 'サイドプラン_{name}.json', en: 'sideplans_{name}.json' },
    'plan.exported': { ja: '{n}件のサイドプランを書き出しました。', en: 'Exported {n} side plan(s).' },
    'plan.fileUnreadable': { ja: 'ファイルを読み込めませんでした。', en: 'The file could not be read.' },
    'plan.importFailed': { ja: '読み込めませんでした：{error}', en: 'Could not import: {error}' },
    'plan.importEmpty': { ja: 'ファイルにサイドプランが入っていませんでした。', en: 'The file contains no side plans.' },
    'plan.confirmImportOverwrite': { ja: '{n}件は同じ名前のプランがすでにあります。上書きしますか？', en: '{n} plan(s) with the same name already exist. Overwrite them?' },
    'plan.imported': { ja: '{total}件読み込みました（新規{added}件・上書き{replaced}件）。', en: 'Imported {total} plan(s) ({added} new, {replaced} overwritten).' },
    'plan.importedOther': { ja: 'うち{n}件は別のデッキ用なので、そのデッキを開くと出てきます。', en: ' {n} of them are for other decks and appear when you open those decks.' },
    'plan.current': { ja: 'サイドプラン：{name}', en: 'Side plan: {name}' },
    'plan.currentCustom': { ja: 'サイドプラン：カスタム', en: 'Side plan: custom' },
    'plan.err.json': { ja: 'JSON として読み取れませんでした。', en: 'The file is not valid JSON.' },
    'plan.err.format': { ja: 'このアプリで書き出したサイドプランのファイルではありません。', en: 'This is not a side plan file exported from this app.' },
    'plan.err.version': { ja: '対応していない形式です（version {version}）。', en: 'Unsupported format (version {version}).' },
    'plan.err.plans': { ja: 'plans が見つかりません。', en: '"plans" was not found.' },
    'plan.err.deck': { ja: '{i}件目：デッキ名（deck）がありません。', en: 'Item {i}: the deck name ("deck") is missing.' },
    'plan.err.name': { ja: '{i}件目：プラン名（name）がありません。', en: 'Item {i}: the plan name ("name") is missing.' },
    'plan.err.cards': { ja: '{i}件目（{name}）：in / out は [{"count": 枚数, "name": "カード名"}] の形にしてください。', en: 'Item {i} ({name}): "in" / "out" must look like [{"count": number, "name": "card name"}].' },
  };

  const STORAGE_KEY = 'mtg-goldfish:pref:imageMode';
  let lang = 'ja';

  /** 保存されている設定から言語を決める（「英語のみ（業務用）」なら英語） */
  function langFromPrefs() {
    try {
      return JSON.parse(root.localStorage.getItem(STORAGE_KEY)) === 'work' ? 'en' : 'ja';
    } catch (e) {
      return 'ja';
    }
  }

  function setLang(l) {
    lang = l === 'en' ? 'en' : 'ja';
    if (root.document) root.document.documentElement.lang = lang;
  }

  function getLang() {
    return lang;
  }

  /** 今の言語の文言。{name} などに params の値を入れる。英語がなければ日本語 */
  function t(key, params) {
    const entry = I18N[key];
    let text = entry ? (entry[lang] || entry.ja) : key;
    if (params) text = text.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m));
    return text;
  }

  /** index.html の data-i18n 系の属性が付いた文言をまとめて差し替える */
  function applyI18n(scope) {
    const doc = scope || root.document;
    doc.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    doc.querySelectorAll('[data-i18n-title]').forEach((n) => { n.title = t(n.dataset.i18nTitle); });
    doc.querySelectorAll('[data-i18n-placeholder]').forEach((n) => { n.placeholder = t(n.dataset.i18nPlaceholder); });
    doc.querySelectorAll('[data-i18n-aria]').forEach((n) => { n.setAttribute('aria-label', t(n.dataset.i18nAria)); });
    if (!scope) root.document.title = t('app.title');
  }

  const api = { I18N, t, setLang, getLang, langFromPrefs, applyI18n };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    setLang(langFromPrefs());
    root.MTG = Object.assign(root.MTG || {}, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
