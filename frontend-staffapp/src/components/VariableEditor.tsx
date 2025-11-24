import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  IconButton,
  HStack,
  VStack,
  useToast,
  Text,
  Editable,
  EditableInput,
  EditablePreview,
  Tooltip,
} from '@chakra-ui/react';
import { EditIcon, CheckIcon, AddIcon } from '@chakra-ui/icons';
import { promptApi } from '../services/api';
import type { Variable } from '../types/prompt.types';
import AddVariableModal from './AddVariableModal';
import BulkVariableUpload from './BulkVariableUpload';

interface VariableEditorProps {
  clauseId: string;
  variables: Variable[];
  onUpdate: () => void;
}

export default function VariableEditor({ clauseId, variables, onUpdate }: VariableEditorProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const toast = useToast();

  const updateMutation = useMutation({
    mutationFn: ({ variableName, value }: { variableName: string; value: string }) =>
      promptApi.updateVariable(clauseId, {
        variable_name: variableName,
        variable_value: value,
      }),
    onSuccess: () => {
      setEditingId(null);
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update variable',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const startEditing = (variable: Variable) => {
    setEditingId(variable.id!);
    setEditValue(variable.variable_value);
  };

  const saveEdit = (variableName: string) => {
    if (editValue.trim()) {
      updateMutation.mutate({ variableName, value: editValue });
    }
  };

  if (variables.length === 0) {
    return (
      <VStack spacing={4} py={8}>
        <Text color="gray.500">No variables defined for this prompt</Text>
        <HStack>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Variable
          </Button>
          <Button
            variant="outline"
            colorScheme="blue"
            onClick={() => setIsBulkModalOpen(true)}
          >
            Bulk Upload
          </Button>
        </HStack>
        <AddVariableModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          clauseId={clauseId}
          onSuccess={onUpdate}
        />
        <BulkVariableUpload
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          clauseId={clauseId}
          onSuccess={onUpdate}
        />
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="flex-end">
        <Button
          leftIcon={<AddIcon />}
          size="sm"
          colorScheme="blue"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Variable
        </Button>
        <Button
          size="sm"
          variant="outline"
          colorScheme="blue"
          onClick={() => setIsBulkModalOpen(true)}
        >
          Bulk Upload
        </Button>
      </HStack>

      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Variable Name</Th>
              <Th>Value</Th>
              <Th>Description</Th>
              <Th width="80px">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {variables.map((variable) => (
              <Tr key={variable.id}>
                <Td fontFamily="monospace" fontSize="sm">
                  {variable.variable_name}
                </Td>
                <Td>
                  {editingId === variable.id ? (
                    <HStack>
                      <Input
                        size="sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveEdit(variable.variable_name);
                          } else if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                      />
                      <IconButton
                        aria-label="Save"
                        icon={<CheckIcon />}
                        size="sm"
                        colorScheme="green"
                        onClick={() => saveEdit(variable.variable_name)}
                        isLoading={updateMutation.isPending}
                      />
                    </HStack>
                  ) : (
                    <Editable
                      value={variable.variable_value}
                      fontSize="sm"
                      onEdit={() => startEditing(variable)}
                    >
                      <EditablePreview
                        cursor="pointer"
                        _hover={{ bg: 'gray.50' }}
                        px={2}
                        py={1}
                        borderRadius="md"
                      />
                      <EditableInput />
                    </Editable>
                  )}
                </Td>
                <Td fontSize="sm" color="gray.600">
                  {variable.description || '-'}
                </Td>
                <Td>
                  <Tooltip label="Edit value">
                    <IconButton
                      aria-label="Edit"
                      icon={<EditIcon />}
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(variable)}
                    />
                  </Tooltip>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <AddVariableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        clauseId={clauseId}
        onSuccess={onUpdate}
      />
      <BulkVariableUpload
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        clauseId={clauseId}
        onSuccess={onUpdate}
      />
    </VStack>
  );
}
