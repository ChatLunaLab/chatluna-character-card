export interface v2DataWorldInfoEntry {
    keys: string[]
    secondary_keys?: string[]
    comment: string
    content: string
    constant: boolean
    selective: boolean
    insertion_order: number
    enabled: boolean
    position: string
    extensions: v2DataWorldInfoEntryExtensionInfos
    id: number
}

export interface v2DataWorldInfoEntryExtensionInfos {
    position: number
    exclude_recursion: boolean
    probability: number
    useProbability: boolean
    depth: number
    selectiveLogic: number
    group: string
    group_override: boolean
    group_weight: number
    prevent_recursion: boolean
    delay_until_recursion: boolean
    scan_depth: number
    match_whole_words: boolean
    use_group_scoring: boolean
    case_sensitive: boolean
    automation_id: string
    role: number
    vectorized: boolean
    display_index: number
}

export interface v2WorldInfoBook {
    name: string
    entries: v2DataWorldInfoEntry[]
}

export interface v2CharData {
    name: string
    description: string
    character_version: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
    creator_notes: string
    tags: string[]
    system_prompt: string
    post_history_instructions: string
    creator: string
    alternate_greetings: string[]
    character_book: v2WorldInfoBook
    extensions: v2CharDataExtensionInfos
}

export interface v2CharDataExtensionInfos {
    talkativeness: number
    fav: boolean
    world: string
    depth_prompt: {
        depth: number
        prompt: string
        role: 'system' | 'user' | 'assistant'
    }
    regex_scripts: RegexScriptData[]
    pygmalion_id?: string
    github_repo?: string
    source_url?: string
    chub?: { full_path: string }
    risuai?: { source: string[] }
}

export interface RegexScriptData {
    id: string
    scriptName: string
    findRegex: string
    replaceString: string
    trimStrings: string[]
    placement: number[]
    disabled: boolean
    markdownOnly: boolean
    promptOnly: boolean
    runOnEdit: boolean
    substituteRegex: boolean
    minDepth: number
    maxDepth: number
}

export interface v1CharData {
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
    creatorcomment: string
    tags: string[]
    talkativeness: number
    fav: boolean | string
    create_date: string
    data: v2CharData
    // Non-standard extensions added by the ST server
    chat: string
    avatar: string
    json_data: string
}
