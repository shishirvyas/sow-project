import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  useToast,
  FormErrorMessage,
} from '@chakra-ui/react';
import { promptApi } from '../services/api';
import type { CreateVariableData } from '../types/prompt.types';

interface AddVariableModalProps {
  isOpen: boolean;
  onClose: () => void;
  clauseId: string;
  onSuccess: () => void;
}

export default function AddVariableModal({
  isOpen,
  onClose,
  clauseId,
  onSuccess,
}: AddVariableModalProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateVariableData>();

  const mutation = useMutation({
    mutationFn: (data: CreateVariableData) => promptApi.addVariable(clauseId, data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Variable added successfully',
        status: 'success',
        duration: 3000,
      });
      reset();
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add variable',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: CreateVariableData) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add New Variable</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.variable_name} isRequired>
                <FormLabel>Variable Name</FormLabel>
                <Input
                  {...register('variable_name', { required: 'Variable name is required' })}
                  placeholder="e.g., supplier_name"
                  fontFamily="monospace"
                />
                <FormErrorMessage>{errors.variable_name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.variable_value} isRequired>
                <FormLabel>Variable Value</FormLabel>
                <Input
                  {...register('variable_value', { required: 'Variable value is required' })}
                  placeholder="Enter the value"
                />
                <FormErrorMessage>{errors.variable_value?.message}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Textarea
                  {...register('description')}
                  placeholder="Describe this variable"
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" colorScheme="blue" isLoading={mutation.isPending}>
              Add Variable
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
