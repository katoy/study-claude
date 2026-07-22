<?php

namespace Tests\Unit\Services;

use App\Enums\ContactStatus;
use App\Models\Contact;
use App\Services\ContactCsvExporter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\LazyCollection;
use Mockery;
use Tests\TestCase;

class ContactCsvExporterTest extends TestCase
{
    public function test_export_handles_null_values(): void
    {
        $contact = new Contact([
            'status' => ContactStatus::New,
        ]);
        $contact->id = 1;
        $contact->name = null;
        $contact->email = null;
        $contact->subject = null;
        $contact->body = null;
        $contact->created_at = now();

        $queryMock = Mockery::mock(Builder::class);
        $queryMock->shouldReceive('cursor')
            ->once()
            ->andReturn(LazyCollection::make([$contact]));

        $exporter = new ContactCsvExporter;
        $response = $exporter->export($queryMock);

        ob_start();
        $response->sendContent();
        $content = ob_get_clean();

        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }

        $lines = explode("\n", rtrim($content, "\n"));
        $row = str_getcsv($lines[1]);

        $this->assertEquals('', $row[1]); // name
        $this->assertEquals('', $row[2]); // email
        $this->assertEquals('', $row[3]); // subject
        $this->assertEquals('', $row[4]); // body
    }
}
