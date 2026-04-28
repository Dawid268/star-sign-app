import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

type LegalPageKey = 'terms' | 'privacy' | 'cookies' | 'disclaimer';

const LEGAL_PAGES: Record<
  LegalPageKey,
  { title: string; updatedAt: string; notice?: string; sections: Array<{ heading: string; body: string }> }
> = {
  terms: {
    title: 'Regulamin',
    updatedAt: '28 kwietnia 2026',
    notice:
      'Przed publikacją produkcyjną uzupełnij dane administratora, adres kontaktowy i docelowego operatora płatności.',
    sections: [
      {
        heading: 'Zakres usługi',
        body:
          'Star Sign udostępnia treści astrologiczne, tarotowe, numerologiczne oraz konto użytkownika z funkcjami personalizacji. Treści mają charakter informacyjno-rozrywkowy i nie są poradą prawną, medyczną, finansową ani psychologiczną.',
      },
      {
        heading: 'Konto użytkownika',
        body:
          'Użytkownik odpowiada za poprawność danych podanych w profilu oraz za zabezpieczenie dostępu do konta. Dane profilu są wykorzystywane do personalizacji odczytów i obsługi subskrypcji.',
      },
      {
        heading: 'Subskrypcja premium',
        body:
          'Funkcje premium odblokowują rozszerzone odczyty i historię zapisanych treści. Płatności i fakturowanie obsługuje zewnętrzny operator płatności wskazany w konfiguracji produkcyjnej, a dostęp może zostać ograniczony po anulowaniu lub nieudanej płatności.',
      },
      {
        heading: 'Odpowiedzialność',
        body:
          'Serwis nie gwarantuje określonych rezultatów życiowych, finansowych ani zdrowotnych. Decyzje podejmowane na podstawie treści serwisu pozostają odpowiedzialnością użytkownika.',
      },
    ],
  },
  privacy: {
    title: 'Polityka prywatności',
    updatedAt: '28 kwietnia 2026',
    notice:
      'Dane administratora są placeholderem launchowym i muszą zostać zastąpione realnymi danymi przed publicznym ruchem.',
    sections: [
      {
        heading: 'Administrator danych',
        body:
          'Administratorem danych jest właściciel serwisu Star Sign. Nazwa podmiotu, adres rejestrowy oraz adres kontaktowy do spraw danych osobowych wymagają uzupełnienia przed publikacją produkcyjną domeny.',
      },
      {
        heading: 'Zakres przetwarzania',
        body:
          'Przetwarzamy dane konta, adres e-mail, dane profilu urodzeniowego, historię odczytów, status subskrypcji oraz podstawowe dane techniczne potrzebne do bezpieczeństwa i działania serwisu.',
      },
      {
        heading: 'Cel przetwarzania',
        body:
          'Dane są wykorzystywane do obsługi konta, personalizacji treści, wysyłki newslettera po zgodzie, obsługi płatności, bezpieczeństwa oraz analityki technicznej.',
      },
      {
        heading: 'Prawa użytkownika',
        body:
          'Użytkownik może żądać dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania oraz wycofania zgody marketingowej. Docelowy adres kontaktowy dla tych żądań trzeba uzupełnić przed startem produkcyjnym.',
      },
    ],
  },
  cookies: {
    title: 'Polityka cookies',
    updatedAt: '28 kwietnia 2026',
    notice: 'Jeśli dodasz analitykę lub remarketing, podłącz banner zgód i zaktualizuj tę stronę przed publikacją.',
    sections: [
      {
        heading: 'Czym są cookies',
        body:
          'Cookies i podobne technologie pomagają utrzymać sesję, zapamiętać ustawienia, mierzyć podstawową jakość działania serwisu oraz zabezpieczać formularze.',
      },
      {
        heading: 'Kategorie',
        body:
          'Serwis używa cookies niezbędnych do działania konta i bezpieczeństwa. Analityka, marketing i remarketing mogą zostać włączone dopiero po skonfigurowaniu zgód produkcyjnych.',
      },
      {
        heading: 'Zarządzanie',
        body:
          'Użytkownik może ograniczyć cookies w ustawieniach przeglądarki. Wyłączenie cookies niezbędnych może ograniczyć logowanie, panel użytkownika i płatności.',
      },
    ],
  },
  disclaimer: {
    title: 'Disclaimer treści',
    updatedAt: '28 kwietnia 2026',
    notice:
      'Ten disclaimer opisuje charakter treści astrologicznych i AI; nie zastępuje docelowej weryfikacji prawnej przed launchem.',
    sections: [
      {
        heading: 'Charakter treści',
        body:
          'Horoskopy, tarot, numerologia i interpretacje generowane z pomocą AI są treściami refleksyjno-rozrywkowymi. Nie zastępują konsultacji ze specjalistą.',
      },
      {
        heading: 'AI i redakcja',
        body:
          'Część contentu może być tworzona lub wspierana przez workflow AI, a następnie monitorowana przez administratora. Logi workflow przechowują prompt, odpowiedź, status i błędy w celu kontroli jakości.',
      },
      {
        heading: 'Decyzje użytkownika',
        body:
          'Nie podejmuj decyzji zdrowotnych, prawnych, finansowych ani bezpieczeństwa wyłącznie na podstawie treści Star Sign. W sprawach wysokiej wagi skonsultuj się z odpowiednim specjalistą.',
      },
    ],
  },
};

@Component({
  selector: 'app-legal-page',
  imports: [RouterLink],
  template: `
    <main class="bg-[#FFFBFB] min-h-screen pt-16 pb-24">
      <section class="section-container max-w-4xl">
        <a routerLink="/" class="text-sm text-mystic-rose font-semibold tracking-widest uppercase">Star Sign</a>
        <h1 class="serif-display text-4xl md:text-6xl text-mystic-cocoa mt-8 mb-4">{{ page.title }}</h1>
        <p class="text-mystic-cocoa/60 mb-12">Ostatnia aktualizacja: {{ page.updatedAt }}</p>

        @if (page.notice) {
          <div class="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900 mb-10">
            <p class="text-sm font-medium">{{ page.notice }}</p>
          </div>
        }

        <div class="space-y-8">
          @for (section of page.sections; track section.heading) {
            <section class="border-t border-mystic-rose/15 pt-8">
              <h2 class="serif-display text-2xl text-mystic-cocoa mb-4">{{ section.heading }}</h2>
              <p class="text-mystic-cocoa/70 leading-relaxed font-light">{{ section.body }}</p>
            </section>
          }
        </div>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);
  public readonly page = LEGAL_PAGES[(this.route.snapshot.data['page'] as LegalPageKey) || 'disclaimer'];
}
