import { ArrowLeft, Shield, Heart } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const handleGoBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#1F2937]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB]">
        <div className="container mx-auto px-6 py-4">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 text-[#1A8A00] hover:text-[#228B22] transition-colors font-sans font-bold uppercase text-xs tracking-widest bg-white px-4 py-2 rounded-full shadow-sm border border-[#E5E7EB]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Tiempo de Mascotas</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-sm p-8 md:p-16 border border-[#E5E7EB]">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F0FDF4] rounded-full mb-6">
              <Shield className="w-8 h-8 text-[#1A8A00]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#111827] mb-2 uppercase">
              POLÍTICA DE PRIVACIDAD
            </h1>
            <p className="text-[#1A8A00] font-bold text-lg mb-4">
              TIEMPO DE MASCOTAS
            </p>
            <p className="text-[#6B7280] text-sm">
              Última actualización: 06 de mayo de 2026
            </p>
          </div>

          <div className="prose prose-slate max-w-none space-y-8 text-sm md:text-base leading-relaxed text-[#374151]">
            <p>
              La presente Política de Privacidad establece los términos en que Tiempo de Mascotas recopila, utiliza, almacena, protege y trata los datos personales de los usuarios y clientes que acceden al sitio web, realizan compras a través de la plataforma WooCommerce, utilizan nuestros canales digitales o visitan nuestro local comercial.
            </p>
            <p>
              Al acceder y utilizar nuestro sitio web y servicios, el usuario declara haber leído, comprendido y aceptado esta Política de Privacidad.
            </p>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">1. IDENTIFICACIÓN DEL RESPONSABLE</h2>
              <p><strong>Nombre comercial:</strong> Tiempo de Mascotas</p>
              <p><strong>Actividad:</strong> Comercialización de productos para mascotas, alimentos, accesorios, medicamentos veterinarios y artículos relacionados, mediante tienda física y comercio electrónico.</p>
              <p><strong>Canales de atención:</strong> Sitio web, WhatsApp, redes sociales y atención presencial.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">2. DATOS PERSONALES RECOPILADOS</h2>
              <p>Tiempo de Mascotas podrá recopilar y tratar los siguientes datos personales:</p>
              <div className="mt-4 space-y-3">
                <p><strong>Datos de identificación</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Nombre y apellido</li>
                  <li>Número de documento de identidad o RUC</li>
                  <li>Nombre de empresa (cuando corresponda)</li>
                </ul>
                <p><strong>Datos de contacto</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Número telefónico</li>
                  <li>Dirección de correo electrónico</li>
                  <li>Dirección física de entrega y facturación</li>
                </ul>
                <p><strong>Datos de comercial y transaccionales</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Historial de compras</li>
                  <li>Productos adquiridos</li>
                  <li>Información de pagos y pedidos</li>
                  <li>Preferencias de consumo</li>
                </ul>
                <p><strong>Datos técnicos y de navegación</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Dirección IP</li>
                  <li>Tipo de navegador</li>
                  <li>Dispositivo utilizado</li>
                  <li>Cookies y tecnologías similares</li>
                  <li>Información de acceso y navegación en el sitio web</li>
                </ul>
                <p><strong>Información adicional proporcionada voluntariamente</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Datos relacionados con mascotas</li>
                  <li>Consultas realizadas</li>
                  <li>Comentarios o valoraciones</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">3. FINALIDAD DEL TRATAMIENTO DE LOS DATOS</h2>
              <p>Los datos personales serán utilizados para las siguientes finalidades:</p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>Gestionar el registro de usuarios en la tienda online.</li>
                <li>Procesar compras, pagos y envíos.</li>
                <li>Emitir facturas y comprobantes legales.</li>
                <li>Coordinar entregas y retiros de productos.</li>
                <li>Brindar soporte y atención al cliente.</li>
                <li>Gestionar cambios, devoluciones y garantías.</li>
                <li>Enviar comunicaciones comerciales, promociones y novedades.</li>
                <li>Mejorar la experiencia del usuario y optimizar el funcionamiento del sitio web.</li>
                <li>Realizar análisis estadísticos y comerciales.</li>
                <li>Prevenir actividades fraudulentas o usos indebidos de la plataforma.</li>
                <li>Cumplir obligaciones legales y regulatorias aplicables.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">4. BASE LEGAL DEL TRATAMIENTO</h2>
              <p>El tratamiento de los datos personales se realiza con fundamento en:</p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>La aceptación expresa del usuario.</li>
                <li>La ejecución de una relación comercial o contractual.</li>
                <li>El cumplimiento de obligaciones legales.</li>
                <li>El interés legítimo de Tiempo de Mascotas para mejorar sus servicios y proteger sus operaciones comerciales.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">5. PROTECCIÓN Y CONSERVACIÓN DE LOS DATOS</h2>
              <p>Tiempo de Mascotas adopta medidas técnicas, administrativas y organizativas razonables para proteger los datos personales contra:</p>
              <ul className="list-disc pl-5 space-y-1 mt-4">
                <li>Acceso no autorizado</li>
                <li>Alteración</li>
                <li>Divulgación</li>
                <li>Pérdida</li>
                <li>Destrucción o uso indebido</li>
              </ul>
              <p className="mt-4">Los datos serán conservados únicamente durante el tiempo necesario para cumplir las finalidades descritas en esta política y las obligaciones legales correspondientes.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">6. USO DE COOKIES</h2>
              <p>El sitio web puede utilizar cookies propias y de terceros con fines técnicos, estadísticos, funcionales y publicitarios.</p>
              <p className="mt-4">Las cookies permiten:</p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>Recordar preferencias del usuario.</li>
                <li>Facilitar procesos de compra.</li>
                <li>Analizar tráfico y comportamiento de navegación.</li>
                <li>Mejorar la experiencia del usuario.</li>
                <li>Personalizar contenido y promociones.</li>
              </ul>
              <p className="mt-4">El usuario podrá configurar su navegador para rechazar o eliminar cookies; sin embargo, algunas funcionalidades del sitio podrían verse afectadas.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">7. PLATAFORMAS DE PAGO Y SERVICIOS DE TERCEROS</h2>
              <p>Las transacciones electrónicas pueden ser procesadas mediante plataformas de pago externas y proveedores logísticos.</p>
              <p className="mt-4">Tiempo de Mascotas no almacena información completa de tarjetas de crédito o débito. Los pagos son procesados mediante sistemas seguros administrados por terceros especializados.</p>
              <p className="mt-4">Asimismo, determinados servicios tecnológicos utilizados por el sitio web pueden implicar la intervención de proveedores externos para:</p>
              <ul className="list-disc pl-5 space-y-1 mt-4">
                <li>Hosting y almacenamiento</li>
                <li>Pasarelas de pago</li>
                <li>Envíos y logística</li>
                <li>Facturación electrónica</li>
                <li>Herramientas de marketing y análisis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">8. COMPARTICIÓN DE INFORMACIÓN</h2>
              <p>Los datos personales no serán vendidos, alquilados ni cedidos a terceros, salvo en los siguientes casos:</p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>Cuando sea necesario para la prestación del servicio.</li>
                <li>Para gestionar pagos, envíos o facturación.</li>
                <li>Por requerimiento judicial o legal.</li>
                <li>Para proteger derechos, seguridad o propiedad de Tiempo de Mascotas.</li>
              </ul>
              <p className="mt-4">Todos los terceros involucrados deberán mantener la confidencialidad y seguridad de la información proporcionada.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">9. DERECHOS DEL TITULAR DE LOS DATOS</h2>
              <p>El usuario podrá solicitar en cualquier momento:</p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>Acceso a sus datos personales.</li>
                <li>Corrección o actualización de información inexacta.</li>
                <li>Eliminación de sus datos cuando legalmente corresponda.</li>
                <li>Oposición al tratamiento de determinados datos.</li>
                <li>Revocación del consentimiento para comunicaciones promocionales.</li>
              </ul>
              <p className="mt-4">Las solicitudes podrán realizarse a través de los canales oficiales de atención de Tiempo de Mascotas.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">10. COMUNICACIONES COMERCIALES</h2>
              <p>El usuario autoriza a Tiempo de Mascotas a enviar comunicaciones relacionadas con:</p>
              <ul className="list-disc pl-5 space-y-1 mt-4">
                <li>Promociones</li>
                <li>Ofertas especiales</li>
                <li>Novedades</li>
                <li>Recordatorios de compra</li>
                <li>Información comercial relevante</li>
              </ul>
              <p className="mt-4">Estas comunicaciones podrán realizarse mediante:</p>
              <ul className="list-disc pl-5 space-y-1 mt-4">
                <li>Correo electrónico</li>
                <li>WhatsApp</li>
                <li>SMS</li>
                <li>Redes sociales</li>
                <li>Notificaciones del sitio web</li>
              </ul>
              <p className="mt-4">El usuario podrá solicitar la cancelación de dichas comunicaciones en cualquier momento.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">11. MENORES DE EDAD</h2>
              <p>El sitio web y los servicios de Tiempo de Mascotas están dirigidos a personas mayores de edad. No recopilamos intencionalmente datos personales de menores sin autorización de sus padres o representantes legales.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">12. MODIFICACIONES A LA POLÍTICA DE PRIVACIDAD</h2>
              <p>Tiempo de Mascotas se reserva el derecho de modificar o actualizar la presente Política de Privacidad en cualquier momento, con el fin de adecuarla a cambios legales, tecnológicos o comerciales.</p>
              <p className="mt-4">Las modificaciones entrarán en vigencia desde su publicación en el sitio web.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">13. CONTACTO</h2>
              <p>Para consultas relacionadas con privacidad, tratamiento de datos personales o ejercicio de derechos, el usuario podrá comunicarse mediante los canales oficiales de Tiempo de Mascotas.</p>
            </section>

            <div className="border-t border-[#E5E7EB] pt-12 mt-12">
              <h1 className="text-3xl font-bold text-[#111827] mb-8 uppercase text-center">
                POLÍTICAS DE DEVOLUCIÓN O CAMBIO
              </h1>

              <div className="space-y-10">
                <section>
                  <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">PARA CLIENTE COMPRA EN TIENDA</h2>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Se podrá realizar cambio de productos (presentaciones cerradas) únicamente si la misma se encuentra nuevo, en su empaque original con su etiqueta y no se encuentra abierto o maltratado. El cambio se realiza en nuetra tienda física.</li>
                    <li>Deberá de presentar su ticket o factura de compra y que no haya transcurrido mas de 20 dias hábiles posteriores a su compra. No se procesaran cambios y/o devoluciones de producto sin recibo de compra.</li>
                    <li>Los cambios y/o devoluciones podrán ser aceptadas una vez autorizadas por el encargado/a de control de calidad.</li>
                    <li>Para productos de consumo, si la bolsa contiene menos de la mitad del contenido o si ha estado abierta durante más de 20 días, no será posible el cambio por mal estado.</li>
                    <li>Los productos de pedidos especiales, productos de venta a granel y en oferta son de venta final por la tanto no se podrán cambiar, reembolsar ni devolver.</li>
                    <li>El costo del envio y reenvio para el cambio por disconformidad con el producto o por pedido mal hecho por el cliente, estarán a cargo del cliente, excepto cuando se tratase por un defecto del producto, caso en la cual el cambio será sin costo adicional.</li>
                    <li>El cliente deberá de verificar si es que el producto que retira corresponde a su pedido, en caso contrario, el cambio solo se podrá procesar cuando el producto esta cerrado en su empaje original. Una vez abierta ya el paquete ya no se podrá hacer cambio aunque fuese producto no correspondiente.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-[#111827] mb-4 uppercase">PARA CLIENTE COMPRA ONLINE</h2>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Se podrá realizar cambio de productos (presentaciones cerradas) únicamente si la misma se encuentra nuevo, en su empaque original con su etiqueta y no se encuentra abierto o maltratado..</li>
                    <li>La posibilidad de cambio por el mismo articulo siempre estará sujeta a su disponibilidad en stock. También se puede procesar por algún otro articulo o dejarlo como saldo a favor para futuras compras</li>
                    <li>Los cambios y/o devoluciones podrán ser aceptadas una vez autorizadas por el encargado/a de control de calidad</li>
                    <li>Para productos de consumo, si la bolsa contiene menos de la mitad del contenido o si ha estado abierta durante más de 20 días, no será posible el cambio por mal estado.</li>
                    <li>Los productos de pedidos especiales, productos de venta a granel y en oferta son de venta final por la tanto no se podrán cambiar, reembolsar ni devolver.</li>
                    <li>Los productos mal entregados por el comercio al cliente, el costo que genera para el cambio queda a cargo del comercio.</li>
                    <li>El cliente deberá verificar en su momento de recibir su pedido si es que están correctos, si es que el reclamos fuera posterior del retiro del delivery luego de la entrega, el costo de cambio ya quedaría a cargo del cliente cual fuese su motivo. No se puede efectuar cambio de los productos ya abiertos por cualquier fuese su motivo.</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-[#E5E7EB] text-center">
            <p className="text-[#9CA3AF] text-xs font-medium flex items-center justify-center gap-2">
              © {new Date().getFullYear()} Tiempo de Mascotas <Heart className="w-3 h-3 text-[#1A8A00] fill-current" /> Cuidado experto para tu mascota.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
