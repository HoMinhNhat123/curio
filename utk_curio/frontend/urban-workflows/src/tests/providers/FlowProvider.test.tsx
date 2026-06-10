import React, {
    createContext,
    useState,
    useContext,
    ReactNode,
    useCallback,
    useMemo,
    useRef,
    useEffect,
} from "react";
import { renderHook, act } from '@testing-library/react';
import { useNodeState } from "hook/useNodeState";
import { getOutgoers, MarkerType, useEdges, useEdgesState, useReactFlow } from "reactflow";
import { jsInterpreter, pythonInterpreter } from "hook/useCode";


/**Heavy depenecencies mocking and will change as the test file gets bigger*/
jest.mock('reactflow', () => ({
  useNodesState: () => ([[], jest.fn(), jest.fn()]),
  useEdgesState: () => ([[], jest.fn(), jest.fn()]),
  useReactFlow: () => ({
    getNodes: () => [],
    getEdges: () => [],
    getNode: () => undefined
  }),
  addEdge: jest.fn((edge, edges) => [...edges, edge]),
  getOutgoers: () => [],
  MarkerType: {ArrowClosed: 'arrowclosed'}
}));

jest.mock('../../providers/ToastProvider', () => ({
  useToastContext: () => ({ showToast: jest.fn() })
}));

jest.mock('../../providers/CollaborationProvider', () => ({
  useCollab: () => ({
    enabled: false,
    onRemote: jest.fn(() => jest.fn()),
    broadcastNodeAdded: jest.fn(),
    broadcastNodeRemoved: jest.fn(),
    broadcastEdgeAdded: jest.fn(),
    broadcastEdgeRemoved: jest.fn()
  }),
}));


jest.mock('../../hook/useWorkflowOperations', () => ({
  useWorkflowOperations: () => ({
    markNodeExecuted: jest.fn(),
    markNodeStale: jest.fn(),
    markDirty: jest.fn()
  }),
}));

jest.mock('../../hook/useCode', () => ({
  pythonInterpreter: {},
  jsInterpreter: {},
}));

