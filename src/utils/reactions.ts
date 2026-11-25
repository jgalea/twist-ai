export type Reactions = Record<string, number[]>

export function nonEmptyReactions(
    reactions: Record<string, unknown> | null | undefined,
): Reactions | undefined {
    if (!reactions) return undefined
    const entries = Object.entries(reactions).flatMap(([emoji, ids]): [string, number[]][] => {
        const userIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'number') : []
        return userIds.length > 0 ? [[emoji, userIds]] : []
    })
    return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export function reactionUserIds(reactions: Reactions | undefined): number[] {
    return reactions ? Object.values(reactions).flat() : []
}

export function formatReactions(
    reactions: Reactions | undefined,
    names: Record<number, string | undefined>,
): string | undefined {
    if (!reactions) return undefined
    return Object.entries(reactions)
        .map(([emoji, ids]) => `${emoji} ${ids.map((id) => names[id] ?? id).join(', ')}`)
        .join(' | ')
}
