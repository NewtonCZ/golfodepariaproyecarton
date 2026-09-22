// Submit Ticket to Supabase & Backend
const handleSubmitTicket = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrorMessage(null);

  if (!name.trim()) {
    setErrorMessage('Por favor ingresa tu nombre completo o usuario.');
    return;
  }

  if (!email.trim() && !phone.trim()) {
    setErrorMessage('Por favor proporciona al menos un medio de contacto (correo o teléfono/WhatsApp).');
    return;
  }

  if (!subject.trim()) {
    setErrorMessage('Por favor ingresa un asunto breve para tu reclamo.');
    return;
  }

  if (!description.trim() || description.trim().length < 10) {
    setErrorMessage('Por favor describe tu reclamo con mayor detalle (mínimo 10 caracteres).');
    return;
  }

  setIsSubmitting(true);

  const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const newTicket: SupportTicket = {
    id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ticketNumber,
    userName: name.trim(),
    userEmail: email.trim(),
    userPhone: phone.trim(),
    category: TICKET_CATEGORIES.find((c) => c.id === category)?.label || category,
    priority,
    subject: subject.trim(),
    description: description.trim(),
    imageUrl: attachedImage || undefined,
    imageName: attachedImageName || undefined,
    status: 'Abierto',
    createdAt: new Date().toISOString(),
  };

  let supabaseSuccess = false;
  let supabaseError: string | null = null;

  // 1. Envío directo a Supabase (SOLO a 'reclamos')
  try {
    if (supabase.isConfigured) {
      const payload = {
        user_id: currentUser?.id || null,
        user_name: newTicket.userName,
        user_email: newTicket.userEmail,
        user_phone: newTicket.userPhone,
        category: newTicket.category,
        priority: newTicket.priority.toLowerCase(),
        subject: newTicket.subject,
        description: newTicket.description,
        image_url: newTicket.imageUrl || null,
        image_name: newTicket.imageName || null,
        status: 'open',
      };

      const { data, error } = await supabase
        .from('reclamos')
        .insert([payload])
        .select()
        .single();

      if (error) {
        supabaseError = error.message || 'Error al guardar el reclamo';
        console.warn('[CustomerSupport] Supabase error:', error);
      } else if (data) {
        supabaseSuccess = true;
        // Usar el UUID real de Supabase como ticketNumber
        newTicket.ticketNumber = data.id;
      }
    }
  } catch (err: any) {
    console.warn('[CustomerSupport] Error al insertar en Supabase:', err);
    supabaseError = err?.message || 'Error de conexión';
  }

  // 2. Notificación al backend (opcional)
  try {
    await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket: newTicket,
        supabaseSynced: supabaseSuccess,
      }),
    });
  } catch (apiErr) {
    console.warn('[CustomerSupport] Error notificando al backend:', apiErr);
  }

  // 3. Guardar en Storage Local (espejo)
  const updatedTickets = [newTicket, ...savedTickets];
  setSavedTickets(updatedTickets);
  try {
    localStorage.setItem('tusupercarton_support_tickets', JSON.stringify(updatedTickets));
  } catch (e) {}

  setIsSubmitting(false);

  // Si falló Supabase, mostrar error
  if (!supabaseSuccess && supabaseError) {
    setErrorMessage(`No se pudo guardar el reclamo: ${supabaseError}. Intenta de nuevo.`);
    return;
  }

  setSubmittedTicket(newTicket);

  // Limpiar formulario
  setSubject('');
  setDescription('');
  removeAttachedImage();
};
