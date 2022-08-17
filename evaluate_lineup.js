import * as std from 'std'

const MY_PLAYERS_LIST_FILE = './my-players.data'
const MY_LINEUP_FILE = './my-lineup.data'
const OPPONENT_PLAYERS_LIST_FILE = './opponent-all-players.data'
const OPPONENT_LINEUP_FILE = './opponent-lineup.data'

const DENOMINATION_SHORT_TEXT_TO_NUMS = {
    "awe": [90, 100],
    "bri": [80, 89],
    "sup": [70, 79],
    "exc": [60, 69],
    "good": [50, 59],
    "dec": [40, 49],
    "weak": [30, 39],
    "poor": [15, 29],
    "awf": [0, 14]
}

class Player {
    number = 0
    name = ''
    age = 0
    pos = ''
    sc = 0
    op = 0
    bc = 0
    pa = 0
    ae = 0
    co = 0
    ta = 0
    dp = 0
    form = ''
    foot = ''
}

class LineupPos {
    player = ''
    pos = ''
    playerNum = 0
}

class PassReport {
    ballSender = ''
    pos = ''
    skill = 0
}

class DuelReport {
    attacker = ''
    attackPos = ''
    attackerOp = 0
    attackerBc = 0

    defender = ''
    defendPos = ''
    defenderDp = 0
    defenderTa = 0
}

class AttackReport {
    passReports = []
    duelReports = []
}

function readAllMyPlayersData() {
    let raw = std.loadFile(MY_PLAYERS_LIST_FILE)
    raw = raw.replace(/^\s*[\r\n]/gm,"")
    let lines = raw.split("\n")

    let allPlayers = []
    let current = undefined

    lines.forEach((line, index) => {
        let parts = line.split("\t")

        // skip title line
        if (index == 0) {
            return
        }

        if (!current && parts.length == 1) {
            // process number line
            current = new Player()
            current.number = parts[0]
        } else if (parts.length == 2) {
            // process name line
            current.name = parts[1]
        } else if (parts.length > 2) {
            // process palyer detail line
            current.age = parseInt(parts[3].trim())
            current.pos = parts[4].trim()
            current.sc = parseInt((parts[6].split(" "))[0])
            current.op = parseInt((parts[7].split(" "))[0])
            current.bc = parseInt((parts[8].split(" "))[0])
            current.pa = parseInt((parts[9].split(" "))[0])
            current.ae = parseInt((parts[10].split(" "))[0])
            current.co = parseInt((parts[11].split(" "))[0])
            current.ta = parseInt((parts[12].split(" "))[0])
            current.dp = parseInt((parts[13].split(" "))[0])
            current.foot = parts[14]

            // it's done for the current player
            allPlayers.push(current)
            current = undefined
        }
    })

    return allPlayers
}

function buildPlayerNumToPlayerMap(allMyPlayers) {
    let map = {}
    allMyPlayers.forEach(player => {
        map[player.number] = player
    })

    return map
}

function readMyLineup(myPlayerNumToPlayerMap) {
    let raw = std.loadFile(MY_LINEUP_FILE)
    raw = raw.replace(/^\s*[\r\n]/gm,"")
    let lines = raw.split("\n")

    let allLineupPos = []
    lines.forEach((rawPos, index) => {
        if (index > 10) {
            // we only need 11 players
            return
        }

        let parts = rawPos.split(" ")
        let lineupPos = new LineupPos()
        lineupPos.pos = parts[0].toUpperCase()
        lineupPos.playerNum = parts[1]
        lineupPos.player = myPlayerNumToPlayerMap[lineupPos.playerNum]

        allLineupPos.push(lineupPos)
    })

    return allLineupPos
}

function calculateMiddleDominance(myLineup) {
    // middle fields CM LM RM
    let middlePlayers = []
    filterLineupPlayerByPosition(middlePlayers, myLineup, 'CM')
    filterLineupPlayerByPosition(middlePlayers, myLineup, 'CML')
    filterLineupPlayerByPosition(middlePlayers, myLineup, 'CMR')
    filterLineupPlayerByPosition(middlePlayers, myLineup, 'LM')
    filterLineupPlayerByPosition(middlePlayers, myLineup, 'RM')

    // W OM
    let offensivePlayers = []
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'OM')
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'OML')
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'OMR')
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'LW')
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'RW')

    // WB DM
    let defensivePlayers = []
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'DM')
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'DML')
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'DMR')
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'LWB')
    filterLineupPlayerByPosition(offensivePlayers, myLineup, 'RWB')

    return calculateDominance(middlePlayers) + 0.6 * calculateDominance(offensivePlayers) + 0.3 * calculateDominance(defensivePlayers)
}

function filterLineupPlayerByPosition(resultContainer, myLineup, position) {
    let filtered = myLineup.filter(lineup => lineup.pos === position)
    if (filtered.length == 0) {
        console.log('Postion ', position, ' has no player')
    }

    resultContainer.push(...filtered)
}

function calculateDominance(lineupPlayers) {
    // PA * 2 + BC + OP + min(OP + BC, TA + DP)
    let pa = 0
    let bc = 0
    let op = 0
    let ta = 0
    let dp = 0

    lineupPlayers.forEach(lineup => {
        pa += lineup.player.pa
        bc += lineup.player.bc
        op += lineup.player.op
        ta += lineup.player.ta
        dp += lineup.player.dp
    })

    return pa * 2 + bc + op + Math.min(op + bc, ta + dp)
}

function readOpponentPlayersData() {
    let raw = std.loadFile(OPPONENT_PLAYERS_LIST_FILE)
    raw = raw.replace(/^\s*[\r\n]/gm,"")
    let lines = raw.split("\n")

    let allPlayers = []
    lines.forEach((content, index) => {
        let parts = content.split("\t")

        if (index == 0) {
            // skip title line
            return
        }

        if (parts.length < 2) {
            return
        }

        let player = new Player()
        player.name = parts[0]
        player.age = parseInt(parts[2].trim())
        player.pos = parts[3].trim()
        player.rate = parseInt(parts[4])
        player.sc = getNumericalValue(parts[5])
        player.op = getNumericalValue(parts[6])
        player.bc = getNumericalValue(parts[7])
        player.pa = getNumericalValue(parts[8])
        player.ae = getNumericalValue(parts[9])
        player.co = getNumericalValue(parts[10])
        player.ta = getNumericalValue(parts[11])
        player.dp = getNumericalValue(parts[12])
        player.foot = parts[13]

        allPlayers.push(player)
    })

    return allPlayers
}

function getNumericalValue(denominationShortTextual) {
    denominationShortTextual = denominationShortTextual.trim()
    let values = DENOMINATION_SHORT_TEXT_TO_NUMS[denominationShortTextual]

    let result = 0
    if (values) {
        result = (values[0] + values[1]) / 2
    } else if (!isNaN(denominationShortTextual)) {
        result = parseInt(denominationShortTextual)
    }

    return result
}

function readOpponentLineupData(playerNameToPlayerMap) {
    let raw = std.loadFile(OPPONENT_LINEUP_FILE)
    raw = raw.replace(/^\s*[\r\n]/gm,"")
    let lines = raw.split("\n")

    let allLineupPos = []
    lines.forEach((rawPos, index) => {
        if (index > 10) {
            // we only need 11 players
            return
        }

        let parts = rawPos.split("\t")
        let lineupPos = new LineupPos()
        lineupPos.pos = parts[0].trim()
        lineupPos.player = playerNameToPlayerMap[parts[1]]

        allLineupPos.push(lineupPos)
    })

    return allLineupPos
}

function buildPlayerNameToPlayerMap(opponentPlayers) {
    let map = {}
    opponentPlayers.forEach(player => {
        map[player.name.trim()] = player
    })

    return map
}

function extractLineupByPos(lineup, posSet) {
    return lineup.filter(it => posSet.has(it.pos))
}

// generate duel report in middle field
function buildLeftMiddleDuelReport(attackTeamLineup, defendTeamLineup) {
    let passersPosSet = new Set()
    passersPosSet.add('LB')
    passersPosSet.add('LWB')

    let attackerMiddlePosSet = new Set()
    attackerMiddlePosSet.add('LM')
    attackerMiddlePosSet.add('LW')

    let defenderMiddlePosSet = new Set()
    defenderMiddlePosSet.add('RM')
    defenderMiddlePosSet.add('RB')

    return buildMiddleDuelReport(attackTeamLineup, defendTeamLineup, passersPosSet, attackerMiddlePosSet, defenderMiddlePosSet)
}

function buildCenterMiddleDuelReport(attackTeamLineup, defendTeamLineup) {
    let passersPosSet = new Set()
    passersPosSet.add('CB')
    passersPosSet.add('CBL')
    passersPosSet.add('CBR')

    let attackerMiddlePosSet = new Set()
    attackerMiddlePosSet.add('CM')
    attackerMiddlePosSet.add('CML')
    attackerMiddlePosSet.add('CMR')
    attackerMiddlePosSet.add('OM')
    attackerMiddlePosSet.add('DM')
    attackerMiddlePosSet.add('DML')
    attackerMiddlePosSet.add('DMR')

    let defenderMiddlePosSet = new Set()
    defenderMiddlePosSet.add('CM')
    defenderMiddlePosSet.add('CML')
    defenderMiddlePosSet.add('CMR')
    defenderMiddlePosSet.add('DM')
    defenderMiddlePosSet.add('DML')
    defenderMiddlePosSet.add('DMR')

    return buildMiddleDuelReport(attackTeamLineup, defendTeamLineup, passersPosSet, attackerMiddlePosSet, defenderMiddlePosSet)
}

function buildRightMiddleDuelReport(attackTeamLineup, defendTeamLineup) {
    let passersPosSet = new Set()
    passersPosSet.add('RB')
    passersPosSet.add('RWB')

    let attackerMiddlePosSet = new Set()
    attackerMiddlePosSet.add('RM')
    attackerMiddlePosSet.add('RW')

    let defenderMiddlePosSet = new Set()
    defenderMiddlePosSet.add('LM')
    defenderMiddlePosSet.add('LB')

    return buildMiddleDuelReport(attackTeamLineup, defendTeamLineup, passersPosSet, attackerMiddlePosSet, defenderMiddlePosSet)
}

function buildMiddleDuelReport(attackTeamLineup, defendTeamLineup, passersPosSet, attackerMiddlePosSet, defenderMiddlePosSet) {
    let ballPassers = extractLineupByPos(attackTeamLineup, passersPosSet)

    let attackers = extractLineupByPos(attackTeamLineup, attackerMiddlePosSet)

    let defenders = extractLineupByPos(defendTeamLineup, defenderMiddlePosSet)

    return buildDuelReport(ballPassers, attackers, defenders)
}

function buildDuelReport(ballPassers, attackers, defenders) {
    let attackReport = new AttackReport()

    // evaluate ball passers
    ballPassers.forEach(passer => {
        let passReport = new PassReport()
        passReport.ballSender = passer.player.name
        passReport.pos = passer.pos
        passReport.skill = passer.player.pa
        attackReport.passReports.push(passReport)
    })

    // evaluate positional duel and tech duel stage
    attackers.forEach(attacker => {
        defenders.forEach(defender => {
            let duelReport = new DuelReport()
            duelReport.attacker = attacker.player.name
            duelReport.attackPos = attacker.pos
            duelReport.attackerOp = attacker.player.op
            duelReport.attackerBc = attacker.player.bc
            duelReport.defender = defender.player.name
            duelReport.defendPos = defender.pos
            duelReport.defenderDp = defender.player.dp
            duelReport.defenderTa = defender.player.ta

            attackReport.duelReports.push(duelReport)
        })
    })

    return attackReport
}
//

// read data
let allMyPlayers = readAllMyPlayersData()
let myPlayerNumberToPlayerMap = buildPlayerNumToPlayerMap(allMyPlayers)
let myLineup = readMyLineup(myPlayerNumberToPlayerMap)

let opponentPlayers = readOpponentPlayersData()
let opponentPlayerNameToPlayerMap = buildPlayerNameToPlayerMap(opponentPlayers)
let opponentLineup = readOpponentLineupData(opponentPlayerNameToPlayerMap)

// calculate dominance
let myMiddleDominance = calculateMiddleDominance(myLineup)
let opponentDominance = calculateMiddleDominance(opponentLineup)
console.log("Middle Domiance: my team vs opponent ===> ", myMiddleDominance, " vs ", opponentDominance, "\n")

// evaluate middle field duel when attacking
let leftAttackDuelReport = buildLeftMiddleDuelReport(myLineup, opponentLineup)
console.log("Middle Duel at left when attacking: => ", JSON.stringify(leftAttackDuelReport, null, 2), "\n")

let rightAttackDuelReport = buildRightMiddleDuelReport(myLineup, opponentLineup)
console.log("Middle Duel at right when attacking: => ", JSON.stringify(rightAttackDuelReport, null, 2), "\n")

let centerAttackDuelReport = buildCenterMiddleDuelReport(myLineup, opponentLineup)
console.log("Middle Duel at center when attacking: => ", JSON.stringify(centerAttackDuelReport, null, 2), "\n")

// evaluate middle field duel when defending
let leftDefendDuelReport = buildLeftMiddleDuelReport(opponentLineup, myLineup)
console.log("Middle Duel at left when defending: => ", JSON.stringify(leftDefendDuelReport, null, 2), "\n")

let rightDefendDuelReport = buildRightMiddleDuelReport(opponentLineup, myLineup)
console.log("Middle Duel at right when defending: => ", JSON.stringify(rightDefendDuelReport, null, 2), "\n")

let centerDefendDuelReport = buildCenterMiddleDuelReport(opponentLineup, myLineup)
console.log("Middle Duel at center when defending: => ", JSON.stringify(centerDefendDuelReport, null, 2), "\n")
