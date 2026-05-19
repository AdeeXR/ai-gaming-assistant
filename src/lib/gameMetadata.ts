export type GameRoleGuidance = Record<string, string>;

export type GameMetadata = {
  title: string;
  description: string;
  guidance: string;
  objectiveGuidance: string;
  roleGuidance?: GameRoleGuidance;
};

export const gameMetadata: Record<string, GameMetadata> = {
  'Call of Duty: Black Ops 7 / Warzone': {
    title: 'Call of Duty: Black Ops 7 / Warzone',
    description: 'A fast-paced battle royale and modern combat shooter focused on positioning, loadouts, and squad-level decision-making.',
    guidance: 'Evaluate loadout optimization, cover usage, rotation timing, squad spacing, armor economy, high-ground control, and information gathering during endgame circles.',
    objectiveGuidance: 'Prioritize zone control, contract completion, cash economy, loadout access, armor and healing management, and safe rotations over reckless engagements.',
    roleGuidance: {
      'Assault / Slayer': 'Focus on first-contact accuracy, timing of pushes, clearing angles, and trading kills while preserving squad health.',
      'Support / Utility': 'Focus on resupply, area denial, map awareness, revives, and priority targets to protect teammates and extend the squad’s life.',
      'Recon / Sniper': 'Focus on long-range positioning, stealth, overwatch, and timely information calls to enable better rotations and avoid bad fights.'
    }
  },
  'League of Legends': {
    title: 'League of Legends',
    description: 'A strategic 5v5 MOBA with distinct champion roles, lane control, vision, and objective-based macro play.',
    guidance: 'Analyze wave management, vision control, objective timing, champion trades, teamfight execution, macro rotations, and snowball prevention.',
    objectiveGuidance: 'Focus on dragon/baron control, turret trades, jungle pathing, vision setups, Rift Herald usage, and calling favorable fights around objectives.',
    roleGuidance: {
      Top: 'Evaluate split-push timing, durable trading, teleport plays, wave management, and ability to impact teamfights from the side lane.',
      Jungle: 'Evaluate jungle pathing, objective tracking, gank timing, vision control, counter-jungling, and mid-to-late-game pressure.',
      Mid: 'Evaluate roams, wave control, priority trading, roaming impact, and ability to influence side lanes while maintaining mid presence.',
      ADC: 'Evaluate damage output, positioning in teamfights, wave management, and effective use of spacing and peel in the backline.',
      Support: 'Evaluate vision setup, peel priority, engage/disengage calls, cooldown management, and objective assistance.'
    }
  },
  Valorant: {
    title: 'Valorant',
    description: 'A tactical shooter where utility usage, map control, agent synergy, and economy management decide rounds.',
    guidance: 'Evaluate utility deployment, entry timing, site executes/retakes, crosshair placement, economy decisions, and adaptation to enemy strategies.',
    objectiveGuidance: 'Prioritize clearing angles, using abilities to gain map control, efficient economic choices, and coordinated timing for site takes and retakes.',
    roleGuidance: {
      Duelist: 'Evaluate how aggressively the player engages, their entry fragging reliability, and whether they create space without overextending.',
      Controller: 'Evaluate smoke and area-denial usage, sightline control, and how well they shape execute and post-plant positioning.',
      Initiator: 'Evaluate utility use for opening fights, information gathering, and enabling allies to enter the site safely.',
      Sentinel: 'Evaluate anchoring, flank safety, delayed rotations, and ability to lock down areas while supporting teammates.'
    }
  },
  'Counter-Strike 2': {
    title: 'Counter-Strike 2',
    description: 'A classic tactical FPS with a strong focus on economy, utility, map control, and teamwork for bombsite wins and retakes.',
    guidance: 'Evaluate economy management, utility usage, map control, trade positioning, peek discipline, bombsite default execution, and retake coordination.',
    objectiveGuidance: 'Focus on buying and saving decisions, map control setup, information gathering, and how team decisions align with the round plan and current economy.',
    roleGuidance: {
      'Entry Fragger': 'Evaluate timing, peek discipline, ability to win first fights, and whether they clear angles while enabling teammates.',
      AWPer: 'Evaluate shot selection, positioning, crosshair placement, and ability to hold or take impactful areas while maintaining economy responsibility.',
      Support: 'Evaluate utility usage, trading support, lurk reads, and how well they set up teammates for successful site entries or defenses.',
      Lurker: 'Evaluate map awareness, timing of flanks, ability to gather information, and impact on enemy rotations without giving away position.',
      IGL: 'Evaluate call clarity, strategic pacing, economy-based decisions, and how well team execution matches the plan.'
    }
  },
  'Marvel Rivals': {
    title: 'Marvel Rivals',
    description: 'A fast-paced team brawler where character matchups, zoning, burst execution, and objective pressure win fights.',
    guidance: 'Evaluate ability combos, objective control, zoning, burst windows, team synergy, and when to disengage versus commit in a fight.',
    objectiveGuidance: 'Focus on timing ability combinations, controlling power nodes/objectives, maintaining spacing, and using mobility to avoid bad trades.',
    roleGuidance: {
      Striker: 'Evaluate burst timing, target priorities, and whether the player uses their abilities to secure fast eliminations without overcommitting.',
      Support: 'Evaluate peel, sustain, crowd control, and how well the player enables their partner to stay in fights.',
      'Zone Controller': 'Evaluate area denial, spacing, and ability usage to block enemy advances or protect objectives.'
    }
  },
  'Overwatch 2': {
    title: 'Overwatch 2',
    description: 'A hero shooter with tanks, damage dealers, and supports where objective control and ult economy are critical.',
    guidance: 'Analyze ultimate economy, positioning, healing priorities, target focus, and the team’s ability to hold or contest the payload/point.',
    objectiveGuidance: 'Prioritize controlling choke points, maintaining high ground, using ultimates in sync, and adapting to enemy composition changes.',
    roleGuidance: {
      Tank: 'Evaluate space creation, damage soaking, target focus, and whether ult usage is enabling the team’s frontline.',
      DPS: 'Evaluate damage consistency, target pressure, positioning, flank timing, and kill priority.',
      Support: 'Evaluate healing output, defensive ability timing, positioning, and whether they keep key teammates alive through fights.'
    }
  },
  'Rocket League': {
    title: 'Rocket League',
    description: 'A high-speed car soccer game where rotation, boost management, and shot accuracy determine success.',
    guidance: 'Evaluate rotation discipline, boost economy, aerial decisions, shot selection, backboard defense, and passing versus solo play.',
    objectiveGuidance: 'Focus on consistent rotation, recognizing pressure versus reset moments, and balancing offense with defensive coverage.',
  },
  'Rainbow Six Siege': {
    title: 'Rainbow Six Siege',
    description: 'A tactical shooter emphasizing utility, drone usage, vertical play, and coordinated team execution around bomb sites.',
    guidance: 'Analyze gadget usage, operator synergies, drone intel, anchor positioning, roam pressure, and timing of executes/retakes.',
    objectiveGuidance: 'Prioritize information gathering, denial of enemy utility, and playing around the objective site with solid crossfires and adaptation.',
  }
};

export const gameTitles = [...Object.keys(gameMetadata), 'Other'];
