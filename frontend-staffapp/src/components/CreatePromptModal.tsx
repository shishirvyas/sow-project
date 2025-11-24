import { useState } from 'react';
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
  Switch,
  useToast,
  FormErrorMessage,
} from '@chakra-ui/react';
import { promptApi } from '../services/api';
import type { CreatePromptData } from '../types/prompt.types';

interface CreatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePromptModal({ isOpen, onClose, onSuccess }: CreatePromptModalProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreatePromptData>({
    defaultValues: {
      is_active: true,
    },
  });

  const mutation = useMutation({
    mutationFn: promptApi.createPrompt,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Prompt created successfully',
        status: 'success',
        duration: 3000,
      });
      reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create prompt',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: CreatePromptData) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Prompt</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.clause_id} isRequired>
                <FormLabel>Clause ID</FormLabel>
                <Input
                  {...register('clause_id', { required: 'Clause ID is required' })}
                  placeholder="e.g., ADM-E01"
                />
                <FormErrorMessage>{errors.clause_id?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.name} isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  {...register('name', { required: 'Name is required' })}
                  placeholder="Descriptive name for the prompt"
                />
                <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.prompt_text} isRequired>
                <FormLabel>Prompt Text</FormLabel>
                <Textarea
                  {...register('prompt_text', { required: 'Prompt text is required' })}
                  placeholder="Enter the full prompt text with {{variable}} placeholders"
                  rows={10}
                  fontFamily="monospace"
                  fontSize="sm"
                />
                <FormErrorMessage>{errors.prompt_text?.message}</FormErrorMessage>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Active</FormLabel>
                <Switch {...register('is_active')} defaultChecked />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={mutation.isPending}
            >
              Create Prompt
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
