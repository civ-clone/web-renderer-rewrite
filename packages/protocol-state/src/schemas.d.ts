/**
 * Zod schemas for runtime validation at protocol trust boundaries.
 * Use these only at ingress/egress points (network, worker boundary).
 * Do not validate with these on every hot-path operation.
 */
import { z } from "zod";
export declare const actionDescriptorSchema: z.ZodObject<{
    actionType: z.ZodString;
    mandatory: z.ZodBoolean;
    valueType: z.ZodOptional<z.ZodString>;
    valueId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    actionType: string;
    mandatory: boolean;
    valueType?: string | undefined;
    valueId?: string | undefined;
}, {
    actionType: string;
    mandatory: boolean;
    valueType?: string | undefined;
    valueId?: string | undefined;
}>;
export declare const playerActionDescriptorSchema: z.ZodObject<{
    tier: z.ZodLiteral<"player">;
    actionType: z.ZodString;
    mandatory: z.ZodBoolean;
    valueType: z.ZodOptional<z.ZodString>;
    valueId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    actionType: string;
    mandatory: boolean;
    tier: "player";
    valueType?: string | undefined;
    valueId?: string | undefined;
}, {
    actionType: string;
    mandatory: boolean;
    tier: "player";
    valueType?: string | undefined;
    valueId?: string | undefined;
}>;
export declare const unitActionDescriptorSchema: z.ZodObject<{
    tier: z.ZodLiteral<"unit">;
    actionType: z.ZodString;
    mandatory: z.ZodLiteral<false>;
    unitId: z.ZodString;
    fromTileId: z.ZodString;
    toTileId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    actionType: string;
    mandatory: false;
    tier: "unit";
    unitId: string;
    fromTileId: string;
    toTileId?: string | undefined;
}, {
    actionType: string;
    mandatory: false;
    tier: "unit";
    unitId: string;
    fromTileId: string;
    toTileId?: string | undefined;
}>;
export declare const actionRequirementStateSchema: z.ZodObject<{
    mandatory: z.ZodArray<z.ZodObject<{
        actionType: z.ZodString;
        valueType: z.ZodOptional<z.ZodString>;
        valueId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }, {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }>, "many">;
    optional: z.ZodArray<z.ZodObject<{
        actionType: z.ZodString;
        valueType: z.ZodOptional<z.ZodString>;
        valueId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }, {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    optional: {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }[];
    mandatory: {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }[];
}, {
    optional: {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }[];
    mandatory: {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }[];
}>;
export declare const snapshotEnvelopeSchema: z.ZodObject<{
    protocolVersion: z.ZodLiteral<"1.0">;
    matchId: z.ZodString;
    stateVersion: z.ZodNumber;
    turn: z.ZodNumber;
    entities: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    indexes: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    requirementsByPlayer: z.ZodRecord<z.ZodString, z.ZodObject<{
        mandatory: z.ZodArray<z.ZodObject<{
            actionType: z.ZodString;
            valueType: z.ZodOptional<z.ZodString>;
            valueId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }, {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }>, "many">;
        optional: z.ZodArray<z.ZodObject<{
            actionType: z.ZodString;
            valueType: z.ZodOptional<z.ZodString>;
            valueId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }, {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        optional: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[];
        mandatory: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[];
    }, {
        optional: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[];
        mandatory: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[];
    }>>;
    actionsByPlayer: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
        tier: z.ZodLiteral<"player">;
        actionType: z.ZodString;
        mandatory: z.ZodBoolean;
        valueType: z.ZodOptional<z.ZodString>;
        valueId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        actionType: string;
        mandatory: boolean;
        tier: "player";
        valueType?: string | undefined;
        valueId?: string | undefined;
    }, {
        actionType: string;
        mandatory: boolean;
        tier: "player";
        valueType?: string | undefined;
        valueId?: string | undefined;
    }>, "many">>>;
    unitActionsById: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
        tier: z.ZodLiteral<"unit">;
        actionType: z.ZodString;
        mandatory: z.ZodLiteral<false>;
        unitId: z.ZodString;
        fromTileId: z.ZodString;
        toTileId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        actionType: string;
        mandatory: false;
        tier: "unit";
        unitId: string;
        fromTileId: string;
        toTileId?: string | undefined;
    }, {
        actionType: string;
        mandatory: false;
        tier: "unit";
        unitId: string;
        fromTileId: string;
        toTileId?: string | undefined;
    }>, "many">>>;
    checksum: z.ZodString;
}, "strip", z.ZodTypeAny, {
    protocolVersion: "1.0";
    matchId: string;
    stateVersion: number;
    turn: number;
    entities: Record<string, Record<string, Record<string, unknown>>>;
    indexes: Record<string, Record<string, string[]>>;
    requirementsByPlayer: Record<string, {
        optional: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[];
        mandatory: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[];
    }>;
    checksum: string;
    actionsByPlayer?: Record<string, {
        actionType: string;
        mandatory: boolean;
        tier: "player";
        valueType?: string | undefined;
        valueId?: string | undefined;
    }[]> | undefined;
    unitActionsById?: Record<string, {
        actionType: string;
        mandatory: false;
        tier: "unit";
        unitId: string;
        fromTileId: string;
        toTileId?: string | undefined;
    }[]> | undefined;
}, {
    protocolVersion: "1.0";
    matchId: string;
    stateVersion: number;
    turn: number;
    entities: Record<string, Record<string, Record<string, unknown>>>;
    indexes: Record<string, Record<string, string[]>>;
    requirementsByPlayer: Record<string, {
        optional: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[];
        mandatory: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[];
    }>;
    checksum: string;
    actionsByPlayer?: Record<string, {
        actionType: string;
        mandatory: boolean;
        tier: "player";
        valueType?: string | undefined;
        valueId?: string | undefined;
    }[]> | undefined;
    unitActionsById?: Record<string, {
        actionType: string;
        mandatory: false;
        tier: "unit";
        unitId: string;
        fromTileId: string;
        toTileId?: string | undefined;
    }[]> | undefined;
}>;
export declare const deltaEnvelopeSchema: z.ZodObject<{
    protocolVersion: z.ZodLiteral<"1.0">;
    matchId: z.ZodString;
    baseVersion: z.ZodNumber;
    targetVersion: z.ZodNumber;
    patches: z.ZodArray<z.ZodDiscriminatedUnion<"op", [z.ZodObject<{
        op: z.ZodLiteral<"set">;
        path: z.ZodString;
        value: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        path: string;
        op: "set";
        value?: unknown;
    }, {
        path: string;
        op: "set";
        value?: unknown;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"remove">;
        path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        op: "remove";
    }, {
        path: string;
        op: "remove";
    }>, z.ZodObject<{
        op: z.ZodLiteral<"arrayPush">;
        path: z.ZodString;
        value: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        path: string;
        op: "arrayPush";
        value?: unknown;
    }, {
        path: string;
        op: "arrayPush";
        value?: unknown;
    }>, z.ZodObject<{
        op: z.ZodLiteral<"arrayRemoveItem">;
        path: z.ZodString;
        value: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        path: string;
        op: "arrayRemoveItem";
        value?: unknown;
    }, {
        path: string;
        op: "arrayRemoveItem";
        value?: unknown;
    }>]>, "many">;
    resultChecksum: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    protocolVersion: "1.0";
    matchId: string;
    baseVersion: number;
    targetVersion: number;
    patches: ({
        path: string;
        op: "set";
        value?: unknown;
    } | {
        path: string;
        op: "remove";
    } | {
        path: string;
        op: "arrayPush";
        value?: unknown;
    } | {
        path: string;
        op: "arrayRemoveItem";
        value?: unknown;
    })[];
    resultChecksum?: string | undefined;
}, {
    protocolVersion: "1.0";
    matchId: string;
    baseVersion: number;
    targetVersion: number;
    patches: ({
        path: string;
        op: "set";
        value?: unknown;
    } | {
        path: string;
        op: "remove";
    } | {
        path: string;
        op: "arrayPush";
        value?: unknown;
    } | {
        path: string;
        op: "arrayRemoveItem";
        value?: unknown;
    })[];
    resultChecksum?: string | undefined;
}>;
export declare const actionCommandSchema: z.ZodObject<{
    protocolVersion: z.ZodLiteral<"1.0">;
    commandId: z.ZodString;
    matchId: z.ZodString;
    actorPlayerId: z.ZodString;
    clientSeq: z.ZodNumber;
    expectedTurn: z.ZodOptional<z.ZodNumber>;
    tier: z.ZodEnum<["player", "unit"]>;
    actionType: z.ZodString;
    valueType: z.ZodOptional<z.ZodString>;
    valueId: z.ZodOptional<z.ZodString>;
    unitId: z.ZodOptional<z.ZodString>;
    fromTileId: z.ZodOptional<z.ZodString>;
    toTileId: z.ZodOptional<z.ZodString>;
    payload: z.ZodOptional<z.ZodUnknown>;
    sentAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    actionType: string;
    tier: "player" | "unit";
    protocolVersion: "1.0";
    matchId: string;
    commandId: string;
    actorPlayerId: string;
    clientSeq: number;
    sentAt: number;
    valueType?: string | undefined;
    valueId?: string | undefined;
    unitId?: string | undefined;
    fromTileId?: string | undefined;
    toTileId?: string | undefined;
    expectedTurn?: number | undefined;
    payload?: unknown;
}, {
    actionType: string;
    tier: "player" | "unit";
    protocolVersion: "1.0";
    matchId: string;
    commandId: string;
    actorPlayerId: string;
    clientSeq: number;
    sentAt: number;
    valueType?: string | undefined;
    valueId?: string | undefined;
    unitId?: string | undefined;
    fromTileId?: string | undefined;
    toTileId?: string | undefined;
    expectedTurn?: number | undefined;
    payload?: unknown;
}>;
export declare const actionResultSchema: z.ZodObject<{
    commandId: z.ZodString;
    status: z.ZodEnum<["accepted", "rejected", "deferred"]>;
    reasonCode: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    serverSeq: z.ZodNumber;
    resultingStateVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "accepted" | "rejected" | "deferred";
    commandId: string;
    serverSeq: number;
    message?: string | undefined;
    reasonCode?: string | undefined;
    resultingStateVersion?: number | undefined;
}, {
    status: "accepted" | "rejected" | "deferred";
    commandId: string;
    serverSeq: number;
    message?: string | undefined;
    reasonCode?: string | undefined;
    resultingStateVersion?: number | undefined;
}>;
export declare const turnEndRequestSchema: z.ZodObject<{
    protocolVersion: z.ZodLiteral<"1.0">;
    matchId: z.ZodString;
    actorPlayerId: z.ZodString;
    commandId: z.ZodString;
    clientSeq: z.ZodNumber;
    sentAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    protocolVersion: "1.0";
    matchId: string;
    commandId: string;
    actorPlayerId: string;
    clientSeq: number;
    sentAt: number;
}, {
    protocolVersion: "1.0";
    matchId: string;
    commandId: string;
    actorPlayerId: string;
    clientSeq: number;
    sentAt: number;
}>;
export declare const turnEndResultSchema: z.ZodObject<{
    commandId: z.ZodString;
    status: z.ZodEnum<["accepted", "rejected"]>;
    unmetRequirements: z.ZodOptional<z.ZodArray<z.ZodObject<{
        actionType: z.ZodString;
        valueType: z.ZodOptional<z.ZodString>;
        valueId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }, {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }>, "many">>;
    reasonCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "accepted" | "rejected";
    commandId: string;
    reasonCode?: string | undefined;
    unmetRequirements?: {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }[] | undefined;
}, {
    status: "accepted" | "rejected";
    commandId: string;
    reasonCode?: string | undefined;
    unmetRequirements?: {
        actionType: string;
        valueType?: string | undefined;
        valueId?: string | undefined;
    }[] | undefined;
}>;
export declare const engineMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"snapshot">;
    payload: z.ZodObject<{
        protocolVersion: z.ZodLiteral<"1.0">;
        matchId: z.ZodString;
        stateVersion: z.ZodNumber;
        turn: z.ZodNumber;
        entities: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        indexes: z.ZodRecord<z.ZodString, z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        requirementsByPlayer: z.ZodRecord<z.ZodString, z.ZodObject<{
            mandatory: z.ZodArray<z.ZodObject<{
                actionType: z.ZodString;
                valueType: z.ZodOptional<z.ZodString>;
                valueId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }, {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }>, "many">;
            optional: z.ZodArray<z.ZodObject<{
                actionType: z.ZodString;
                valueType: z.ZodOptional<z.ZodString>;
                valueId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }, {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            optional: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
            mandatory: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
        }, {
            optional: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
            mandatory: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
        }>>;
        actionsByPlayer: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
            tier: z.ZodLiteral<"player">;
            actionType: z.ZodString;
            mandatory: z.ZodBoolean;
            valueType: z.ZodOptional<z.ZodString>;
            valueId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            actionType: string;
            mandatory: boolean;
            tier: "player";
            valueType?: string | undefined;
            valueId?: string | undefined;
        }, {
            actionType: string;
            mandatory: boolean;
            tier: "player";
            valueType?: string | undefined;
            valueId?: string | undefined;
        }>, "many">>>;
        unitActionsById: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
            tier: z.ZodLiteral<"unit">;
            actionType: z.ZodString;
            mandatory: z.ZodLiteral<false>;
            unitId: z.ZodString;
            fromTileId: z.ZodString;
            toTileId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            actionType: string;
            mandatory: false;
            tier: "unit";
            unitId: string;
            fromTileId: string;
            toTileId?: string | undefined;
        }, {
            actionType: string;
            mandatory: false;
            tier: "unit";
            unitId: string;
            fromTileId: string;
            toTileId?: string | undefined;
        }>, "many">>>;
        checksum: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        protocolVersion: "1.0";
        matchId: string;
        stateVersion: number;
        turn: number;
        entities: Record<string, Record<string, Record<string, unknown>>>;
        indexes: Record<string, Record<string, string[]>>;
        requirementsByPlayer: Record<string, {
            optional: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
            mandatory: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
        }>;
        checksum: string;
        actionsByPlayer?: Record<string, {
            actionType: string;
            mandatory: boolean;
            tier: "player";
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[]> | undefined;
        unitActionsById?: Record<string, {
            actionType: string;
            mandatory: false;
            tier: "unit";
            unitId: string;
            fromTileId: string;
            toTileId?: string | undefined;
        }[]> | undefined;
    }, {
        protocolVersion: "1.0";
        matchId: string;
        stateVersion: number;
        turn: number;
        entities: Record<string, Record<string, Record<string, unknown>>>;
        indexes: Record<string, Record<string, string[]>>;
        requirementsByPlayer: Record<string, {
            optional: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
            mandatory: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
        }>;
        checksum: string;
        actionsByPlayer?: Record<string, {
            actionType: string;
            mandatory: boolean;
            tier: "player";
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[]> | undefined;
        unitActionsById?: Record<string, {
            actionType: string;
            mandatory: false;
            tier: "unit";
            unitId: string;
            fromTileId: string;
            toTileId?: string | undefined;
        }[]> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "snapshot";
    payload: {
        protocolVersion: "1.0";
        matchId: string;
        stateVersion: number;
        turn: number;
        entities: Record<string, Record<string, Record<string, unknown>>>;
        indexes: Record<string, Record<string, string[]>>;
        requirementsByPlayer: Record<string, {
            optional: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
            mandatory: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
        }>;
        checksum: string;
        actionsByPlayer?: Record<string, {
            actionType: string;
            mandatory: boolean;
            tier: "player";
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[]> | undefined;
        unitActionsById?: Record<string, {
            actionType: string;
            mandatory: false;
            tier: "unit";
            unitId: string;
            fromTileId: string;
            toTileId?: string | undefined;
        }[]> | undefined;
    };
}, {
    type: "snapshot";
    payload: {
        protocolVersion: "1.0";
        matchId: string;
        stateVersion: number;
        turn: number;
        entities: Record<string, Record<string, Record<string, unknown>>>;
        indexes: Record<string, Record<string, string[]>>;
        requirementsByPlayer: Record<string, {
            optional: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
            mandatory: {
                actionType: string;
                valueType?: string | undefined;
                valueId?: string | undefined;
            }[];
        }>;
        checksum: string;
        actionsByPlayer?: Record<string, {
            actionType: string;
            mandatory: boolean;
            tier: "player";
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[]> | undefined;
        unitActionsById?: Record<string, {
            actionType: string;
            mandatory: false;
            tier: "unit";
            unitId: string;
            fromTileId: string;
            toTileId?: string | undefined;
        }[]> | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"delta">;
    payload: z.ZodObject<{
        protocolVersion: z.ZodLiteral<"1.0">;
        matchId: z.ZodString;
        baseVersion: z.ZodNumber;
        targetVersion: z.ZodNumber;
        patches: z.ZodArray<z.ZodDiscriminatedUnion<"op", [z.ZodObject<{
            op: z.ZodLiteral<"set">;
            path: z.ZodString;
            value: z.ZodUnknown;
        }, "strip", z.ZodTypeAny, {
            path: string;
            op: "set";
            value?: unknown;
        }, {
            path: string;
            op: "set";
            value?: unknown;
        }>, z.ZodObject<{
            op: z.ZodLiteral<"remove">;
            path: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: string;
            op: "remove";
        }, {
            path: string;
            op: "remove";
        }>, z.ZodObject<{
            op: z.ZodLiteral<"arrayPush">;
            path: z.ZodString;
            value: z.ZodUnknown;
        }, "strip", z.ZodTypeAny, {
            path: string;
            op: "arrayPush";
            value?: unknown;
        }, {
            path: string;
            op: "arrayPush";
            value?: unknown;
        }>, z.ZodObject<{
            op: z.ZodLiteral<"arrayRemoveItem">;
            path: z.ZodString;
            value: z.ZodUnknown;
        }, "strip", z.ZodTypeAny, {
            path: string;
            op: "arrayRemoveItem";
            value?: unknown;
        }, {
            path: string;
            op: "arrayRemoveItem";
            value?: unknown;
        }>]>, "many">;
        resultChecksum: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        protocolVersion: "1.0";
        matchId: string;
        baseVersion: number;
        targetVersion: number;
        patches: ({
            path: string;
            op: "set";
            value?: unknown;
        } | {
            path: string;
            op: "remove";
        } | {
            path: string;
            op: "arrayPush";
            value?: unknown;
        } | {
            path: string;
            op: "arrayRemoveItem";
            value?: unknown;
        })[];
        resultChecksum?: string | undefined;
    }, {
        protocolVersion: "1.0";
        matchId: string;
        baseVersion: number;
        targetVersion: number;
        patches: ({
            path: string;
            op: "set";
            value?: unknown;
        } | {
            path: string;
            op: "remove";
        } | {
            path: string;
            op: "arrayPush";
            value?: unknown;
        } | {
            path: string;
            op: "arrayRemoveItem";
            value?: unknown;
        })[];
        resultChecksum?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "delta";
    payload: {
        protocolVersion: "1.0";
        matchId: string;
        baseVersion: number;
        targetVersion: number;
        patches: ({
            path: string;
            op: "set";
            value?: unknown;
        } | {
            path: string;
            op: "remove";
        } | {
            path: string;
            op: "arrayPush";
            value?: unknown;
        } | {
            path: string;
            op: "arrayRemoveItem";
            value?: unknown;
        })[];
        resultChecksum?: string | undefined;
    };
}, {
    type: "delta";
    payload: {
        protocolVersion: "1.0";
        matchId: string;
        baseVersion: number;
        targetVersion: number;
        patches: ({
            path: string;
            op: "set";
            value?: unknown;
        } | {
            path: string;
            op: "remove";
        } | {
            path: string;
            op: "arrayPush";
            value?: unknown;
        } | {
            path: string;
            op: "arrayRemoveItem";
            value?: unknown;
        })[];
        resultChecksum?: string | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"actionResult">;
    payload: z.ZodObject<{
        commandId: z.ZodString;
        status: z.ZodEnum<["accepted", "rejected", "deferred"]>;
        reasonCode: z.ZodOptional<z.ZodString>;
        message: z.ZodOptional<z.ZodString>;
        serverSeq: z.ZodNumber;
        resultingStateVersion: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "accepted" | "rejected" | "deferred";
        commandId: string;
        serverSeq: number;
        message?: string | undefined;
        reasonCode?: string | undefined;
        resultingStateVersion?: number | undefined;
    }, {
        status: "accepted" | "rejected" | "deferred";
        commandId: string;
        serverSeq: number;
        message?: string | undefined;
        reasonCode?: string | undefined;
        resultingStateVersion?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "actionResult";
    payload: {
        status: "accepted" | "rejected" | "deferred";
        commandId: string;
        serverSeq: number;
        message?: string | undefined;
        reasonCode?: string | undefined;
        resultingStateVersion?: number | undefined;
    };
}, {
    type: "actionResult";
    payload: {
        status: "accepted" | "rejected" | "deferred";
        commandId: string;
        serverSeq: number;
        message?: string | undefined;
        reasonCode?: string | undefined;
        resultingStateVersion?: number | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"turnEndResult">;
    payload: z.ZodObject<{
        commandId: z.ZodString;
        status: z.ZodEnum<["accepted", "rejected"]>;
        unmetRequirements: z.ZodOptional<z.ZodArray<z.ZodObject<{
            actionType: z.ZodString;
            valueType: z.ZodOptional<z.ZodString>;
            valueId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }, {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }>, "many">>;
        reasonCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "accepted" | "rejected";
        commandId: string;
        reasonCode?: string | undefined;
        unmetRequirements?: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[] | undefined;
    }, {
        status: "accepted" | "rejected";
        commandId: string;
        reasonCode?: string | undefined;
        unmetRequirements?: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "turnEndResult";
    payload: {
        status: "accepted" | "rejected";
        commandId: string;
        reasonCode?: string | undefined;
        unmetRequirements?: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[] | undefined;
    };
}, {
    type: "turnEndResult";
    payload: {
        status: "accepted" | "rejected";
        commandId: string;
        reasonCode?: string | undefined;
        unmetRequirements?: {
            actionType: string;
            valueType?: string | undefined;
            valueId?: string | undefined;
        }[] | undefined;
    };
}>]>;
export declare const rendererMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"action">;
    payload: z.ZodObject<{
        protocolVersion: z.ZodLiteral<"1.0">;
        commandId: z.ZodString;
        matchId: z.ZodString;
        actorPlayerId: z.ZodString;
        clientSeq: z.ZodNumber;
        expectedTurn: z.ZodOptional<z.ZodNumber>;
        tier: z.ZodEnum<["player", "unit"]>;
        actionType: z.ZodString;
        valueType: z.ZodOptional<z.ZodString>;
        valueId: z.ZodOptional<z.ZodString>;
        unitId: z.ZodOptional<z.ZodString>;
        fromTileId: z.ZodOptional<z.ZodString>;
        toTileId: z.ZodOptional<z.ZodString>;
        payload: z.ZodOptional<z.ZodUnknown>;
        sentAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        actionType: string;
        tier: "player" | "unit";
        protocolVersion: "1.0";
        matchId: string;
        commandId: string;
        actorPlayerId: string;
        clientSeq: number;
        sentAt: number;
        valueType?: string | undefined;
        valueId?: string | undefined;
        unitId?: string | undefined;
        fromTileId?: string | undefined;
        toTileId?: string | undefined;
        expectedTurn?: number | undefined;
        payload?: unknown;
    }, {
        actionType: string;
        tier: "player" | "unit";
        protocolVersion: "1.0";
        matchId: string;
        commandId: string;
        actorPlayerId: string;
        clientSeq: number;
        sentAt: number;
        valueType?: string | undefined;
        valueId?: string | undefined;
        unitId?: string | undefined;
        fromTileId?: string | undefined;
        toTileId?: string | undefined;
        expectedTurn?: number | undefined;
        payload?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "action";
    payload: {
        actionType: string;
        tier: "player" | "unit";
        protocolVersion: "1.0";
        matchId: string;
        commandId: string;
        actorPlayerId: string;
        clientSeq: number;
        sentAt: number;
        valueType?: string | undefined;
        valueId?: string | undefined;
        unitId?: string | undefined;
        fromTileId?: string | undefined;
        toTileId?: string | undefined;
        expectedTurn?: number | undefined;
        payload?: unknown;
    };
}, {
    type: "action";
    payload: {
        actionType: string;
        tier: "player" | "unit";
        protocolVersion: "1.0";
        matchId: string;
        commandId: string;
        actorPlayerId: string;
        clientSeq: number;
        sentAt: number;
        valueType?: string | undefined;
        valueId?: string | undefined;
        unitId?: string | undefined;
        fromTileId?: string | undefined;
        toTileId?: string | undefined;
        expectedTurn?: number | undefined;
        payload?: unknown;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"turnEnd">;
    payload: z.ZodObject<{
        protocolVersion: z.ZodLiteral<"1.0">;
        matchId: z.ZodString;
        actorPlayerId: z.ZodString;
        commandId: z.ZodString;
        clientSeq: z.ZodNumber;
        sentAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        protocolVersion: "1.0";
        matchId: string;
        commandId: string;
        actorPlayerId: string;
        clientSeq: number;
        sentAt: number;
    }, {
        protocolVersion: "1.0";
        matchId: string;
        commandId: string;
        actorPlayerId: string;
        clientSeq: number;
        sentAt: number;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "turnEnd";
    payload: {
        protocolVersion: "1.0";
        matchId: string;
        commandId: string;
        actorPlayerId: string;
        clientSeq: number;
        sentAt: number;
    };
}, {
    type: "turnEnd";
    payload: {
        protocolVersion: "1.0";
        matchId: string;
        commandId: string;
        actorPlayerId: string;
        clientSeq: number;
        sentAt: number;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"requestSnapshot">;
    matchId: z.ZodString;
    actorPlayerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "requestSnapshot";
    matchId: string;
    actorPlayerId: string;
}, {
    type: "requestSnapshot";
    matchId: string;
    actorPlayerId: string;
}>]>;
//# sourceMappingURL=schemas.d.ts.map