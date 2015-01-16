#!/usr/bin/env perl
use strict;
use warnings;
use Getopt::Long;
use POSIX qw(setlocale strftime mktime LC_ALL);

my $PATH = './log';
GetOptions(
  'p:s' => \$PATH,
		);

my $FP = undef;
my $FNAME = '';
my $prev = 0;

sub fp {
    my $now = time();
    if ( ($now - $prev) > 1 ) {
        $prev = $now;
        if ( $FP ) {
            $FP->flush();
        }
        my $fname = strftime "$PATH.%Y%m%d", localtime( $now );
        if ( $FNAME eq $fname ) {
            return;
        }
        $FNAME = $fname;
        if ( $FP ) {
            close($FP);
        }
        open($FP, ">>$fname");
    }
}

while ( my $line = <STDIN> ){
    fp();
    print $FP $line;
    print $line;
}
