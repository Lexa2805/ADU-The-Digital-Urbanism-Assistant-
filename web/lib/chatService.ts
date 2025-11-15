import { supabase } from './supabaseClient'
import type { Message } from '@/types'

export class ChatService {
  /**
   * Salvează un mesaj în Supabase
   */
  static async saveMessage(message: Omit<Message, 'id' | 'timestamp'>, requestId?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Utilizator neautentificat')
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: message.role,
        content: message.content,
        checklist: message.checklist || null,
        request_id: requestId || null,
      })

    if (error) {
      console.error('Error saving message:', error)
      throw error
    }
  }

  /**
   * Încarcă toate mesajele utilizatorului curent
   */
  static async loadMessages(): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Utilizator neautentificat')
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      throw error
    }

    return data.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      checklist: msg.checklist,
      timestamp: new Date(msg.created_at),
    }))
  }

  /**
   * Șterge toate mesajele utilizatorului curent
   */
  static async clearMessages(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Utilizator neautentificat')
    }

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error clearing messages:', error)
      throw error
    }
  }

  /**
   * Încarcă mesajele asociate unui anumit dosar
   */
  static async loadMessagesByRequest(requestId: string): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Utilizator neautentificat')
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading request messages:', error)
      throw error
    }

    return data.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      checklist: msg.checklist,
      timestamp: new Date(msg.created_at),
    }))
  }
}
