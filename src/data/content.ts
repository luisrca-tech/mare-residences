export const content = {
  shared: {
    brand: {
      wordmark: "maré",
      descriptor: "R E S I D E N C E S",
    },
    navigation: [
      {
        label: "Home",
        href: "/",
      },
      {
        label: "Residências",
        href: "/residencias",
      },
      {
        label: "Bairro",
        href: "/bairro",
      },
      {
        label: "Contato",
        href: "/contato",
      },
    ],
    headerCta: {
      label: "Agende uma conversa",
      href: "/contato",
    },
    footer: {
      tagline: "Um lugar para viver no seu tempo.",
      notice:
        "Maré Residences — projeto conceitual fictício. Imagens ilustrativas.",
      rows: [
        [
          {
            label: "Home",
            href: "/",
          },
          {
            label: "Residências",
            href: "/residencias",
          },
          {
            label: "Bairro",
            href: "/bairro",
          },
        ],
        [
          {
            label: "Contato",
            href: "/contato",
          },
          {
            label: "Privacidade",
            href: "/privacidade",
          },
        ],
      ],
    },
    cta: {
      eyebrow: "SEU PRÓXIMO CAPÍTULO",
      title: "Vamos imaginar seu próximo endereço?",
      body: "Conte como você quer viver. A conversa começa com o que importa para você.",
      button: {
        label: "Converse com a Maré",
        href: "/contato",
      },
    },
    menu: {
      openLabel: "Menu  +",
      closeLabel: "Fechar  ×",
      title: "Navegação principal",
    },
  },
  home: {
    hero: {
      eyebrow: "MARÉ RESIDENCES · CONCEITO RESIDENCIAL",
      title: "Seu tempo, seu lugar.",
      body: "Arquitetura que acolhe. Espaços para estar, receber e deixar a vida acontecer no seu ritmo.",
      button: {
        label: "Explore as residências",
        href: "/residencias",
      },
      caption: "01 / A luz encontra espaço para ficar.",
    },
    residences: {
      eyebrow: "01 / RESIDÊNCIAS",
      title: "O detalhe faz parte da vida.",
      body: "Texturas naturais, luz suave e ambientes que se conectam. Um convite para morar com presença.",
      features: [
        "Luz natural",
        "Ambientes integrados",
        "Materiais que convidam ao toque",
      ],
      button: {
        label: "Conheça as residências",
        href: "/residencias",
      },
      caption: "02 / Silêncio e textura, em equilíbrio.",
    },
    neighborhood: {
      eyebrow: "02 / BAIRRO",
      title: "A vida acontece logo ali.",
      body: "Entre uma caminhada e um café, descubra o prazer de pertencer ao lugar onde você vive.",
      button: {
        label: "Descubra o bairro",
        href: "/bairro",
      },
      caption: "03 / Encontros no caminho de casa.",
    },
  },
  residences: {
    hero: {
      eyebrow: "RESIDÊNCIAS",
      title: "Espaço para o seu jeito de viver.",
      body: "Um começo tranquilo, uma casa cheia de encontros. Descubra duas maneiras de habitar a Maré.",
      caption: "01 / Ambientes pensados para acolher.",
    },
    layouts: {
      eyebrow: "POSSIBILIDADES DE MORAR",
      title: "Escolha o espaço que faz sentido para você.",
      items: [
        {
          key: "essential",
          title: "Essencial",
          description: "1 dormitório · 58 m²",
          body: "Integração para o cotidiano, com espaço para desacelerar e receber quem chega.",
        },
        {
          key: "horizon",
          title: "Horizonte",
          description: "2 dormitórios · 86 m²",
          body: "Mais possibilidades para compartilhar a casa, trabalhar e criar novos rituais.",
        },
      ],
      disclaimer:
        "Tipologias e áreas fictícias, apresentadas apenas para este conceito. Imagens ilustrativas.",
    },
    details: {
      eyebrow: "MATERIALIDADE",
      title: "O conforto mora nos detalhes.",
      body: "Tons naturais, superfícies táteis e uma paleta que deixa a luz entrar. Cada escolha busca uma sensação simples: estar em casa.",
    },
  },
  neighborhood: {
    hero: {
      eyebrow: "BAIRRO",
      title: "Pertencer começa no caminho.",
      body: "A Maré imagina uma vida conectada ao entorno. Um cotidiano feito de pequenas descobertas, dentro e fora de casa.",
      caption: "01 / O cotidiano ganha novos caminhos.",
    },
    daily: {
      eyebrow: "POR PERTO",
      title: "Perto do cotidiano. Perto de você.",
      items: [
        {
          index: "01",
          title: "Encontros",
          body: "Uma pausa para o café. Uma mesa para conversar. Pequenos lugares que viram parte da rotina.",
        },
        {
          index: "02",
          title: "Caminhos",
          body: "Percursos a pé, descobertas sem pressa e novas formas de olhar o que está perto.",
        },
        {
          index: "03",
          title: "Respiros",
          body: "Tempo ao ar livre e espaço para renovar o ritmo entre os compromissos do dia.",
        },
      ],
      disclaimer:
        "Narrativa de bairro fictícia. As imagens não representam uma localização real do empreendimento.",
    },
  },
  contact: {
    intro: {
      eyebrow: "CONTATO",
      title: "Toda mudança começa com uma conversa.",
    },
    aside: {
      title: "O que faz um lugar ser seu?",
      body: "Conte seus planos, tire suas dúvidas ou conheça melhor o conceito Maré. Vamos escutar o que você procura.",
      mail: "contato@mare.example",
      hours: "Atendimento conceitual\nSegunda a sexta, das 9h às 18h.",
      note: "Canal fictício, apresentado para demonstração.",
    },
    form: {
      fields: [
        {
          key: "name",
          label: "Nome completo",
          placeholder: "Seu nome",
        },
        {
          key: "email",
          label: "E-mail",
          placeholder: "Seu melhor e-mail",
        },
        {
          key: "phone",
          label: "Telefone (opcional)",
          placeholder: "Seu telefone",
        },
        {
          key: "message",
          label: "Mensagem",
          placeholder: "Como você imagina seu próximo lar?",
        },
      ],
      summary: "Revise os campos destacados para continuar.",
      privacy: {
        lead: "Usaremos seus dados para responder a esta conversa. ",
        link: {
          label: "Leia nossa política de privacidade",
          href: "/privacidade",
        },
        end: ".",
      },
      submit: "Enviar mensagem",
      note: "Demonstração: este formulário não envia dados.",
      errors: {
        name: "Informe seu nome completo.",
        email: "Digite um e-mail válido, como nome@exemplo.com.",
        phone: "Digite um telefone com 7 a 15 dígitos, incluindo o DDD.",
        message: "Escreva sua mensagem.",
        nameLength: "Use até 120 caracteres para o nome.",
        messageLength: "Use até 5000 caracteres na mensagem.",
      },
      loading: "Simulando…",
      loadingStatus:
        "Simulação local em andamento. Nenhum dado está sendo enviado.",
      failure:
        "Não foi possível concluir a simulação. Seus dados continuam neste formulário. Tente novamente.",
      success: {
        label: "CONVERSA INICIADA",
        title: "Obrigada por compartilhar seus planos.",
        body: "Simulação concluída. Em uma experiência real, nossa equipe retornaria pelo e-mail informado.",
        note: "Estado demonstrativo: nenhum dado foi enviado.",
        button: {
          label: "Voltar para a Home",
          href: "/",
        },
      },
    },
  },
  privacy: {
    intro: {
      eyebrow: "PRIVACIDADE",
      title: "Sua privacidade, com clareza.",
      notice:
        "Projeto fictício · Documento demonstrativo · Sem revisão jurídica",
    },
    article: {
      sections: [
        {
          title: "01 / Sobre este documento",
          body: "Este é um exemplo demonstrativo de política de privacidade para a marca fictícia Maré Residences. Não descreve uma operação real e não foi revisado juridicamente.",
        },
        {
          title: "02 / Dados de contato",
          body: "Em uma operação real, o formulário poderia solicitar nome, e-mail, telefone opcional e mensagem. Neste protótipo, os dados não são enviados nem armazenados por um serviço de atendimento.",
        },
        {
          title: "03 / Finalidade e cuidado",
          body: "O uso proposto seria responder à solicitação da pessoa e dar continuidade à conversa escolhida por ela. A definição de bases legais, responsáveis e prazos depende da operação real e de revisão especializada.",
        },
        {
          title: "04 / Seus pedidos",
          body: "Uma política de produção deverá explicar como solicitar acesso, correção ou exclusão de dados e como entrar em contato com o responsável pelo tratamento.",
        },
        {
          title: "05 / Cookies e serviços",
          body: "Este conceito não define ferramentas de análise, publicidade ou cookies adicionais. Qualquer integração futura deverá ser documentada antes da publicação.",
        },
        {
          title: "06 / Atualizações",
          body: "Versão demonstrativa de 3 de novembro de 2026. O conteúdo deverá ser substituído e validado antes de qualquer uso público ou coleta real.",
        },
      ],
    },
  },
};
